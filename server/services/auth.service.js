import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { env } from "../lib/env.js";
import { createOpaqueToken, hashOpaqueToken, signAccessToken, verifyAccessToken } from "../lib/auth.js";
import { generateOtp, hashOtp, safeEqualHex } from "../lib/otp.js";
import { decryptSecret, verifyTotpCounter } from "../lib/totp.js";
import { protectTestOtp } from "../lib/test-otp.js";
import { sendEmailOtp, sendSmsOtp } from "./delivery.service.js";

// A valid bcrypt hash ensures unknown accounts take the same expensive comparison path.
const DUMMY_PASSWORD_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEe.ih4XW59DgPF4QY5V5cMI7WnhE3LmI.6";

function fail(message, statusCode, code, details) {
  return Object.assign(new Error(message), { statusCode, code, details });
}

function addSeconds(seconds) {
  return new Date(Date.now() + seconds * 1000);
}

function maskEmail(email) {
  const [local, domain] = email.split("@");
  if (!domain) return "your email";
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"*".repeat(Math.max(2, local.length - visible.length))}@${domain}`;
}

function maskPhone(phone) {
  if (!phone) return "your mobile";
  const compact = phone.replace(/\s+/g, "");
  return `${"*".repeat(Math.max(3, compact.length - 4))}${compact.slice(-4)}`;
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, mfaEnabled: user.mfaEnabled };
}

function availableMethods(user) {
  const methods = [];
  if (user.emailVerified) methods.push({ method: "EMAIL", target: maskEmail(user.email) });
  if (user.phoneVerified && user.phone) methods.push({ method: "SMS", target: maskPhone(user.phone) });
  if (user.totpSecretEncrypted) methods.push({ method: "AUTHENTICATOR", target: "Authenticator app" });
  return methods;
}

async function recordFailedLogin(user) {
  if (!user || (user.lockedUntil && user.lockedUntil > new Date())) return;
  const attempts = user.failedLoginAttempts + 1;
  const shouldLock = attempts >= env.LOGIN_MAX_ATTEMPTS;
  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: shouldLock ? 0 : attempts,
      lockedUntil: shouldLock ? addSeconds(env.LOGIN_LOCKOUT_SECONDS) : null,
    },
  });
}

export async function beginLogin({ identifier, password, rememberMe }) {
  const normalizedIdentifier = identifier.trim().toLowerCase();
  const user = normalizedIdentifier.includes("@")
    ? await prisma.user.findUnique({ where: { email: normalizedIdentifier } })
    : null;
  const passwordMatches = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
  const locked = Boolean(user?.lockedUntil && user.lockedUntil > new Date());
  const eligible = Boolean(user && passwordMatches && !locked && user.status === "ACTIVE" && user.mfaEnabled);

  if (!eligible) {
    if (user && !passwordMatches) await recordFailedLogin(user);
    throw fail("Invalid email or password. Please try again.", 401, "INVALID_CREDENTIALS");
  }

  const methods = availableMethods(user);
  if (methods.length === 0) {
    throw fail("Multi-factor authentication is not available for this account.", 403, "MFA_UNAVAILABLE");
  }

  const loginToken = createOpaqueToken();
  const expiresAt = addSeconds(env.LOGIN_TRANSACTION_TTL_SECONDS);
  const transaction = await prisma.$transaction(async (database) => {
    await database.loginTransaction.updateMany({
      where: { userId: user.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    await database.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
    return database.loginTransaction.create({
      data: {
        userId: user.id,
        tokenHash: hashOpaqueToken(loginToken),
        rememberMe,
        expiresAt,
        maxAttempts: env.OTP_MAX_ATTEMPTS,
      },
    });
  });

  return {
    mfaRequired: true,
    loginToken,
    loginId: transaction.id,
    expiresAt,
    methods,
  };
}

async function activeLoginTransaction(loginToken) {
  const transaction = await prisma.loginTransaction.findUnique({
    where: { tokenHash: hashOpaqueToken(loginToken) },
    include: { user: true },
  });
  if (!transaction || transaction.consumedAt) {
    throw fail("Login transaction is no longer valid. Sign in again.", 401, "LOGIN_TRANSACTION_INVALID");
  }
  if (transaction.expiresAt <= new Date()) {
    throw fail("Login verification expired. Sign in again.", 410, "LOGIN_TRANSACTION_EXPIRED");
  }
  if (transaction.attempts >= transaction.maxAttempts) {
    throw fail("Maximum verification attempts reached. Sign in again.", 429, "OTP_ATTEMPTS_EXCEEDED", { attemptsRemaining: 0 });
  }
  return transaction;
}

function ensureMethodAvailable(user, method) {
  const available = availableMethods(user).some((item) => item.method === method);
  if (!available) throw fail("The selected verification method is unavailable.", 400, "MFA_METHOD_UNAVAILABLE");
}

export async function startLoginChallenge({ loginToken, method }) {
  const transaction = await activeLoginTransaction(loginToken);
  ensureMethodAvailable(transaction.user, method);

  if (method === "AUTHENTICATOR") {
    await prisma.loginTransaction.update({ where: { id: transaction.id }, data: { selectedMethod: method } });
    return {
      method,
      challengeId: transaction.id,
      target: "Authenticator app",
      expiresAt: transaction.expiresAt,
    };
  }

  const channel = method === "SMS" ? "SMS" : "EMAIL";
  const purpose = method === "SMS" ? "LOGIN_SMS" : "LOGIN_EMAIL";
  const otp = generateOtp();
  const expiresAt = addSeconds(env.OTP_TTL_SECONDS);

  const challenge = await prisma.$transaction(async (database) => {
    await database.otpChallenge.updateMany({
      where: { userId: transaction.userId, purpose, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    await database.loginTransaction.update({
      where: { id: transaction.id },
      data: { selectedMethod: method },
    });
    return database.otpChallenge.create({
      data: {
        userId: transaction.userId,
        channel,
        purpose,
        otpHash: hashOtp(otp, env.OTP_SECRET),
        testOtpEncrypted: protectTestOtp(otp),
        expiresAt,
        maxAttempts: env.OTP_MAX_ATTEMPTS,
      },
    });
  });

  if (method === "SMS") await sendSmsOtp({ phone: transaction.user.phone, otp });
  else await sendEmailOtp({ email: transaction.user.email, otp });

  return {
    method,
    challengeId: challenge.id,
    target: method === "SMS" ? maskPhone(transaction.user.phone) : maskEmail(transaction.user.email),
    expiresAt,
  };
}

async function verifyLoginOtpChallenge({ transaction, challengeId, method, otp }) {
  const channel = method === "SMS" ? "SMS" : "EMAIL";
  const purpose = method === "SMS" ? "LOGIN_SMS" : "LOGIN_EMAIL";
  const challenge = await prisma.otpChallenge.findFirst({
    where: { id: challengeId, userId: transaction.userId, channel, purpose },
  });
  if (!challenge || challenge.consumedAt) throw fail("Verification code is no longer valid.", 409, "OTP_INVALIDATED");
  if (challenge.expiresAt <= new Date()) throw fail("Code expired. Request a new code.", 410, "OTP_EXPIRED");
  if (challenge.attempts >= challenge.maxAttempts) {
    throw fail("Maximum verification attempts reached.", 429, "OTP_ATTEMPTS_EXCEEDED", { attemptsRemaining: 0 });
  }

  const valid = safeEqualHex(hashOtp(otp, env.OTP_SECRET), challenge.otpHash);
  if (!valid) {
    const updated = await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 } },
    });
    const attemptsRemaining = Math.max(0, updated.maxAttempts - updated.attempts);
    const statusCode = attemptsRemaining === 0 ? 429 : 400;
    const code = attemptsRemaining === 0 ? "OTP_ATTEMPTS_EXCEEDED" : "INVALID_OTP";
    throw fail(
      attemptsRemaining === 0 ? "Maximum verification attempts reached." : "Incorrect code. Please try again.",
      statusCode,
      code,
      { attemptsRemaining },
    );
  }
  return challenge;
}

async function recordInvalidTotp(transaction) {
  const updated = await prisma.loginTransaction.update({
    where: { id: transaction.id },
    data: { attempts: { increment: 1 } },
  });
  const attemptsRemaining = Math.max(0, updated.maxAttempts - updated.attempts);
  const statusCode = attemptsRemaining === 0 ? 429 : 400;
  throw fail(
    attemptsRemaining === 0 ? "Maximum verification attempts reached." : "Incorrect code. Please try again.",
    statusCode,
    attemptsRemaining === 0 ? "OTP_ATTEMPTS_EXCEEDED" : "INVALID_OTP",
    { attemptsRemaining },
  );
}

export async function completeLogin({ loginToken, method, challengeId, otp }) {
  const transaction = await activeLoginTransaction(loginToken);
  if (transaction.selectedMethod !== method) {
    throw fail("Start the selected verification method before submitting a code.", 400, "MFA_METHOD_MISMATCH");
  }

  let otpChallenge = null;
  let totpCounter = null;
  if (method === "AUTHENTICATOR") {
    if (challengeId !== transaction.id || !transaction.user.totpSecretEncrypted) {
      throw fail("Authenticator challenge is invalid.", 400, "MFA_METHOD_MISMATCH");
    }
    const secret = decryptSecret(transaction.user.totpSecretEncrypted, env.TOTP_ENCRYPTION_KEY);
    totpCounter = verifyTotpCounter({ base32Secret: secret, code: otp });
    if (totpCounter === null || (transaction.user.lastTotpCounter ?? -1) >= totpCounter) {
      await recordInvalidTotp(transaction);
    }
  } else {
    otpChallenge = await verifyLoginOtpChallenge({ transaction, challengeId, method, otp });
  }

  const sessionToken = createOpaqueToken();
  const sessionTtl = transaction.rememberMe ? env.REMEMBER_SESSION_TTL_SECONDS : env.SESSION_TTL_SECONDS;
  const expiresAt = addSeconds(sessionTtl);

  const session = await prisma.$transaction(async (database) => {
    if (totpCounter !== null) {
      const counterUpdate = await database.user.updateMany({
        where: {
          id: transaction.userId,
          OR: [{ lastTotpCounter: null }, { lastTotpCounter: { lt: totpCounter } }],
        },
        data: { lastTotpCounter: totpCounter, lastLoginAt: new Date() },
      });
      if (counterUpdate.count !== 1) throw fail("This authenticator code has already been used.", 409, "OTP_REPLAYED");
    } else {
      await database.user.update({ where: { id: transaction.userId }, data: { lastLoginAt: new Date() } });
    }
    if (otpChallenge) {
      await database.otpChallenge.update({ where: { id: otpChallenge.id }, data: { consumedAt: new Date() } });
    }
    await database.loginTransaction.update({ where: { id: transaction.id }, data: { consumedAt: new Date() } });
    return database.session.create({
      data: {
        userId: transaction.userId,
        tokenHash: hashOpaqueToken(sessionToken),
        rememberMe: transaction.rememberMe,
        expiresAt,
      },
    });
  });

  return {
    sessionToken,
    session,
    user: publicUser(transaction.user),
  };
}

export async function findActiveSession(token) {
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashOpaqueToken(token) },
    include: { user: true },
  });
  if (!session || session.revokedAt || session.expiresAt <= new Date() || session.user.status !== "ACTIVE") return null;
  return session;
}

export async function touchSession(sessionId) {
  await prisma.session.update({ where: { id: sessionId }, data: { lastSeenAt: new Date() } });
}

export async function revokeSession(sessionId) {
  const revokedAt = new Date();
  await prisma.$transaction([
    prisma.session.updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt } }),
    prisma.accessToken.updateMany({ where: { sessionId, revokedAt: null }, data: { revokedAt } }),
  ]);
}

export async function issueAccessToken(session) {
  const jti = crypto.randomUUID();
  const issuedAt = new Date();
  const signed = signAccessToken({ userId: session.userId, jti, issuedAt });
  await prisma.accessToken.create({
    data: {
      id: jti,
      userId: session.userId,
      sessionId: session.id,
      issuedAt,
      expiresAt: signed.expiresAt,
    },
  });
  return { accessToken: signed.token, tokenType: "Bearer", expiresIn: env.JWT_TTL_SECONDS };
}

export async function validateBearerToken(token) {
  let claims;
  try {
    claims = verifyAccessToken(token);
  } catch {
    throw fail("Invalid or expired bearer token.", 401, "INVALID_BEARER_TOKEN");
  }
  const grant = await prisma.accessToken.findUnique({
    where: { id: claims.jti },
    include: { user: true, session: true },
  });
  if (
    !grant ||
    grant.userId !== claims.sub ||
    grant.revokedAt ||
    grant.expiresAt <= new Date() ||
    grant.session.revokedAt ||
    grant.session.expiresAt <= new Date() ||
    grant.user.status !== "ACTIVE"
  ) {
    throw fail("Invalid or expired bearer token.", 401, "INVALID_BEARER_TOKEN");
  }
  return { claims, grant, user: publicUser(grant.user) };
}

export { publicUser };


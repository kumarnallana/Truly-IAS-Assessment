import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { generateOtp, hashOtp, safeEqualHex } from "../lib/otp.js";
import { env } from "../lib/env.js";
import { protectTestOtp } from "../lib/test-otp.js";
import { sendEmailOtp, sendSmsOtp } from "./delivery.service.js";

function challengeExpiry() {
  return new Date(Date.now() + env.OTP_TTL_SECONDS * 1000);
}

function fail(message, statusCode, code = "REQUEST_FAILED", details) {
  return Object.assign(new Error(message), { statusCode, code, details });
}

async function createChallenge({ userId, channel, purpose, otp, db = prisma }) {
  return db.otpChallenge.create({
    data: {
      userId,
      channel,
      purpose,
      otpHash: hashOtp(otp, env.OTP_SECRET),
      testOtpEncrypted: protectTestOtp(otp),
      expiresAt: challengeExpiry(),
      maxAttempts: env.OTP_MAX_ATTEMPTS,
    },
  });
}

export async function registerUser({ name, email, password, phone }) {
  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, 12);
  const otp = generateOtp();
  let result;

  try {
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (existing?.status === "ACTIVE") {
      throw fail(
        "An account with this email already exists. Sign in instead.",
        409,
        "ACCOUNT_EXISTS",
        { email: "This email is already registered. Sign in instead." },
      );
    }

    const userId = existing?.id || crypto.randomUUID();
    const challengeId = crypto.randomUUID();
    const challengeData = {
      id: challengeId,
      userId,
      channel: "EMAIL",
      purpose: "REGISTRATION_EMAIL",
      otpHash: hashOtp(otp, env.OTP_SECRET),
      testOtpEncrypted: protectTestOtp(otp),
      expiresAt: challengeExpiry(),
      maxAttempts: env.OTP_MAX_ATTEMPTS,
    };

    if (existing) {
      // A PENDING account is an interrupted registration, not a permanent
      // conflict. Restart it from email verification and invalidate every
      // stale challenge/transaction so the browser cannot enter a dead end.
      const transactionResults = await prisma.$transaction([
        prisma.accessToken.deleteMany({ where: { userId } }),
        prisma.session.deleteMany({ where: { userId } }),
        prisma.loginTransaction.deleteMany({ where: { userId } }),
        prisma.otpChallenge.deleteMany({ where: { userId } }),
        prisma.user.update({
          where: { id: existing.id },
          data: {
            name: name.trim(),
            passwordHash,
            phone: phone.trim(),
            status: "PENDING",
            emailVerified: false,
            phoneVerified: false,
            mfaEnabled: false,
            mfaMethod: null,
            totpSecretEncrypted: null,
            lastTotpCounter: null,
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastLoginAt: null,
          },
        }),
        prisma.otpChallenge.create({ data: challengeData }),
      ]);
      result = { user: transactionResults[4], challenge: transactionResults[5], resumed: true };
    } else {
      const [user, challenge] = await prisma.$transaction([
        prisma.user.create({
          data: { id: userId, name: name.trim(), email: normalizedEmail, passwordHash, phone: phone.trim(), status: "PENDING" },
        }),
        prisma.otpChallenge.create({ data: challengeData }),
      ]);
      result = { user, challenge, resumed: false };
    }
  } catch (error) {
    if (error?.code === "P2002") {
      throw fail(
        "An account with this email already exists. Sign in instead.",
        409,
        "ACCOUNT_EXISTS",
        { email: "This email is already registered. Sign in instead." },
      );
    }
    throw error;
  }

  await sendEmailOtp({ email: result.user.email, otp });

  return {
    userId: result.user.id,
    challengeId: result.challenge.id,
    channel: "email",
    expiresAt: result.challenge.expiresAt,
    resumed: result.resumed,
  };
}

async function verifyChallenge({ userId, challengeId, otp, channel, purpose }) {
  const challenge = await prisma.otpChallenge.findFirst({ where: { id: challengeId, userId, channel, purpose } });
  if (!challenge) throw fail("OTP challenge not found.", 404);
  if (challenge.consumedAt) throw fail("This OTP has already been used.", 409);
  if (challenge.expiresAt <= new Date()) throw fail("OTP expired. Request a new code.", 410);
  if (challenge.attempts >= challenge.maxAttempts) throw fail("Maximum OTP attempts reached.", 429);
  
  const valid = safeEqualHex(hashOtp(otp, env.OTP_SECRET), challenge.otpHash);
  if (!valid) {
    const updated = await prisma.otpChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
    if (updated.attempts >= updated.maxAttempts) throw fail("Maximum OTP attempts reached.", 429);
    throw fail("Invalid OTP.", 400, { attemptsRemaining: updated.maxAttempts - updated.attempts });
  }
  return challenge;
}

export async function verifyRegistrationEmailOtp({ userId, challengeId, otp }) {
  const challenge = await verifyChallenge({ userId, challengeId, otp, channel: "EMAIL", purpose: "REGISTRATION_EMAIL" });
  await prisma.$transaction([
    prisma.otpChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } }),
    prisma.user.update({ where: { id: userId }, data: { emailVerified: true } }),
  ]);
  return { verified: true };
}

export async function sendRegistrationSmsOtp({ userId }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw fail("User not found.", 404);
  if (!user.emailVerified) throw fail("Verify the email OTP first.", 400);
  
  const otp = generateOtp();
  const challenge = await createChallenge({ userId, channel: "SMS", purpose: "REGISTRATION_SMS", otp });
  await sendSmsOtp({ phone: user.phone, otp });
  
  return { challengeId: challenge.id, channel: "sms", expiresAt: challenge.expiresAt };
}

export async function verifyRegistrationSmsOtp({ userId, challengeId, otp }) {
  const challenge = await verifyChallenge({ userId, challengeId, otp, channel: "SMS", purpose: "REGISTRATION_SMS" });
  await prisma.$transaction([
    prisma.otpChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } }),
    prisma.user.update({ where: { id: userId }, data: { phoneVerified: true } }), // mfaEnabled set only on MFA setup now
  ]);
  return { verified: true };
}

export async function resendRegistrationEmailOtp({ userId }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw fail("User not found.", 404);
  if (user.emailVerified) throw fail("Email is already verified.", 409);
  
  await prisma.otpChallenge.updateMany({
    where: { userId, channel: "EMAIL", purpose: "REGISTRATION_EMAIL", consumedAt: null },
    data: { consumedAt: new Date() },
  });
  
  const otp = generateOtp();
  const challenge = await createChallenge({ userId, channel: "EMAIL", purpose: "REGISTRATION_EMAIL", otp });
  await sendEmailOtp({ email: user.email, otp });
  
  return { challengeId: challenge.id, channel: "email", expiresAt: challenge.expiresAt };
}

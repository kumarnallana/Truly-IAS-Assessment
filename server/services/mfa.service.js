import { prisma } from "../lib/prisma.js";
import { generateOtp, hashOtp, safeEqualHex } from "../lib/otp.js";
import { generateTotpSetup, verifyTotp, encryptSecret, decryptSecret } from "../lib/totp.js";
import { sendEmailOtp, sendSmsOtp } from "./delivery.service.js";
import { env } from "../lib/env.js";

function fail(message, statusCode, details) {
  return Object.assign(new Error(message), { statusCode, details });
}

function challengeExpiry() {
  return new Date(Date.now() + env.OTP_TTL_SECONDS * 1000);
}

export async function selectMfaMethod({ userId, method }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw fail("User not found.", 404);
  if (!user.emailVerified || !user.phoneVerified) {
    throw fail("Verify email and mobile before setting up MFA.", 400);
  }

  if (method === "AUTHENTICATOR") {
    // Generate TOTP setup
    const { base32Secret, otpauthUrl, qrCodeDataUrl } = await generateTotpSetup({ accountName: user.email });
    
    // Encrypt the TOTP secret at rest with AES-256-GCM
    const encryptedSecret = encryptSecret(base32Secret, env.TOTP_ENCRYPTION_KEY);

    // Invalidate any previous unconsumed TOTP setup challenges
    await prisma.otpChallenge.updateMany({
      where: { userId, channel: "AUTHENTICATOR", purpose: "MFA_TOTP_SETUP", consumedAt: null },
      data: { consumedAt: new Date() },
    });

    // Store pending TOTP secret in OtpChallenge (pending-until-verified pattern)
    const challenge = await prisma.otpChallenge.create({
      data: {
        userId,
        channel: "AUTHENTICATOR",
        purpose: "MFA_TOTP_SETUP",
        otpHash: encryptedSecret,
        expiresAt: challengeExpiry(),
        maxAttempts: env.OTP_MAX_ATTEMPTS,
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { mfaMethod: "AUTHENTICATOR" },
    });

    // NOTE: base32Secret is the PLAINTEXT secret for one-time enrollment & manual entry fallback.
    // The encrypted-at-rest ciphertext is never returned to the client.
    return {
      method: "AUTHENTICATOR",
      challengeId: challenge.id,
      otpauthUrl,
      qrCodeDataUrl,
      base32Secret,
      expiresAt: challenge.expiresAt,
    };
  }

  const channel = method === "SMS" ? "SMS" : "EMAIL";
  const purpose = method === "SMS" ? "MFA_VERIFY_SMS" : "MFA_VERIFY_EMAIL";
  const otp = generateOtp();

  // Invalidate any previous unconsumed challenges for this channel/purpose
  await prisma.otpChallenge.updateMany({
    where: { userId, channel, purpose, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  const challenge = await prisma.otpChallenge.create({
    data: {
      userId,
      channel,
      purpose,
      otpHash: hashOtp(otp, env.OTP_SECRET),
      expiresAt: challengeExpiry(),
      maxAttempts: env.OTP_MAX_ATTEMPTS,
    },
  });

  if (method === "SMS") {
    await sendSmsOtp({ phone: user.phone, otp });
  } else {
    await sendEmailOtp({ email: user.email, otp });
  }

  await prisma.user.update({ where: { id: userId }, data: { mfaMethod: method } });
  return { method, challengeId: challenge.id, expiresAt: challenge.expiresAt };
}

export async function verifyMfa({ userId, method, code, challengeId }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw fail("User not found.", 404);
  if (!user.emailVerified || !user.phoneVerified) {
    throw fail("Verify email and mobile before setting up MFA.", 400);
  }

  if (method === "AUTHENTICATOR") {
    let challenge = null;
    if (challengeId) {
      challenge = await prisma.otpChallenge.findFirst({
        where: { id: challengeId, userId, channel: "AUTHENTICATOR", purpose: "MFA_TOTP_SETUP" },
      });
    } else {
      challenge = await prisma.otpChallenge.findFirst({
        where: { userId, channel: "AUTHENTICATOR", purpose: "MFA_TOTP_SETUP", consumedAt: null },
        orderBy: { createdAt: "desc" },
      });
    }

    if (!challenge || challenge.consumedAt) {
      throw fail("MFA setup challenge not found or already consumed.", 404);
    }
    if (challenge.expiresAt <= new Date()) {
      throw fail("MFA setup expired. Please restart setup.", 410);
    }
    if (challenge.attempts >= challenge.maxAttempts) {
      throw fail("Maximum MFA attempts reached.", 429);
    }

    // Decrypt the stored secret using AES-256-GCM
    const base32Secret = decryptSecret(challenge.otpHash, env.TOTP_ENCRYPTION_KEY);
    const isValid = verifyTotp({ base32Secret, code });

    if (!isValid) {
      const updated = await prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      const remaining = updated.maxAttempts - updated.attempts;
      if (remaining <= 0) {
        throw fail("Maximum MFA attempts reached.", 429, { attemptsRemaining: 0 });
      }
      throw fail("Invalid code. Please try again.", 400, { attemptsRemaining: remaining });
    }

    // Pending-until-verified: save encrypted secret and activate MFA on User only upon verified token
    await prisma.$transaction([
      prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { consumedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          totpSecretEncrypted: challenge.otpHash,
          mfaMethod: "AUTHENTICATOR",
          mfaEnabled: true,
          status: "ACTIVE",
        },
      }),
    ]);

    return { verified: true, mfaEnabled: true, registrationComplete: true };
  } else {
    const channel = method === "SMS" ? "SMS" : "EMAIL";
    const purpose = method === "SMS" ? "MFA_VERIFY_SMS" : "MFA_VERIFY_EMAIL";
    const challenge = await prisma.otpChallenge.findFirst({
      where: { id: challengeId, userId, channel, purpose },
    });

    if (!challenge) throw fail("OTP challenge not found.", 404);
    if (challenge.consumedAt) throw fail("This OTP has already been used.", 409);
    if (challenge.expiresAt <= new Date()) throw fail("OTP expired. Request a new code.", 410);
    if (challenge.attempts >= challenge.maxAttempts) throw fail("Maximum attempts reached.", 429);

    const valid = safeEqualHex(hashOtp(code, env.OTP_SECRET), challenge.otpHash);
    if (!valid) {
      const updated = await prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      const remaining = updated.maxAttempts - updated.attempts;
      if (remaining <= 0) {
        throw fail("Maximum attempts reached.", 429, { attemptsRemaining: 0 });
      }
      throw fail("Invalid code.", 400, { attemptsRemaining: remaining });
    }

    await prisma.$transaction([
      prisma.otpChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } }),
      prisma.user.update({
        where: { id: userId },
        data: { mfaMethod: method, mfaEnabled: true, status: "ACTIVE" },
      }),
    ]);

    return { verified: true, mfaEnabled: true, registrationComplete: true };
  }
}

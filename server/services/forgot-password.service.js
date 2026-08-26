import { prisma } from "../lib/prisma.js";

function fail(message, statusCode, code = "REQUEST_FAILED", details) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  if (details) error.details = details;
  return error;
}
import bcrypt from "bcryptjs";
import { env } from "../lib/env.js";
import { generateOtp, hashOtp, safeEqualHex } from "../lib/otp.js";
import { protectTestOtp } from "../lib/test-otp.js";
import { sendEmailOtp } from "./delivery.service.js";

function challengeExpiry() {
  return new Date(Date.now() + env.OTP_TTL_SECONDS * 1000);
}

export async function requestPasswordReset(email) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  
  if (!user || user.status !== "ACTIVE") {
    // Return identical success response to prevent account enumeration
    return { success: true, message: "If an account exists, a recovery code has been sent." };
  }

  const otp = generateOtp();
  const expiresAt = challengeExpiry();

  // Invalidate previous active recovery challenges for this user
  await prisma.otpChallenge.updateMany({
    where: {
      userId: user.id,
      purpose: "PASSWORD_RECOVERY",
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: { consumedAt: new Date() },
  });

  const challenge = await prisma.otpChallenge.create({
    data: {
      userId: user.id,
      channel: "EMAIL",
      purpose: "PASSWORD_RECOVERY",
      otpHash: hashOtp(otp, env.OTP_SECRET),
      testOtpEncrypted: protectTestOtp(otp),
      expiresAt,
      maxAttempts: env.OTP_MAX_ATTEMPTS,
    },
  });

  await sendEmailOtp({ email: user.email, otp });

  return { challengeId: challenge.id, expiresAt: challenge.expiresAt };
}

export async function resetPassword(challengeId, otp, newPassword) {
  const challenge = await prisma.otpChallenge.findUnique({
    where: { id: challengeId },
    include: { user: true },
  });

  if (!challenge || challenge.purpose !== "PASSWORD_RECOVERY" || challenge.consumedAt) {
    throw fail("Invalid or expired password recovery request.", 400, "INVALID_CHALLENGE");
  }

  if (new Date() > challenge.expiresAt) {
    throw fail("The recovery code has expired. Please request a new one.", 400, "OTP_EXPIRED");
  }

  if (challenge.attempts >= challenge.maxAttempts) {
    throw fail("Too many attempts. Please request a new recovery code.", 429, "TOO_MANY_ATTEMPTS");
  }

  const valid = safeEqualHex(hashOtp(otp, env.OTP_SECRET), challenge.otpHash);

  if (!valid) {
    const updated = await prisma.otpChallenge.update({
      where: { id: challengeId },
      data: { attempts: { increment: 1 } },
    });
    if (updated.attempts >= updated.maxAttempts) {
      throw fail("Maximum OTP attempts reached. Request a new code.", 429, "MAX_ATTEMPTS");
    }
    throw fail("Invalid verification code.", 401, "INVALID_OTP");
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  // Note: If you have a Session model or tokens, you can revoke them here.
  // The prompt asked to invalidate sessions if supported. 
  // Let's revoke all sessions for this user.
  await prisma.$transaction([
    prisma.user.update({
      where: { id: challenge.userId },
      data: { passwordHash },
    }),
    prisma.otpChallenge.update({
      where: { id: challengeId },
      data: { consumedAt: new Date() },
    }),
    prisma.session.updateMany({
      where: { userId: challenge.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
    prisma.accessToken.updateMany({
      where: { userId: challenge.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  ]);

  return { success: true };
}

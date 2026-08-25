import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { generateOtp, hashOtp, safeEqualHex } from "../lib/otp.js";
import { env } from "../lib/env.js";
import { sendEmailOtp, sendSmsOtp } from "./delivery.service.js";

function challengeExpiry() {
  return new Date(Date.now() + env.OTP_TTL_SECONDS * 1000);
}

function fail(message, statusCode, details) {
  return Object.assign(new Error(message), { statusCode, details });
}

async function createChallenge({ userId, channel, purpose, otp }) {
  return prisma.otpChallenge.create({
    data: {
      userId,
      channel,
      purpose,
      otpHash: hashOtp(otp, env.OTP_SECRET),
      expiresAt: challengeExpiry(),
      maxAttempts: env.OTP_MAX_ATTEMPTS,
    },
  });
}

export async function registerUser({ name, email, password, phone }) {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) throw fail("An account with this email already exists.", 409);
  
  // Cost factor 12 as requested
  const passwordHash = await bcrypt.hash(password, 12);
  
  const user = await prisma.user.create({
    data: { name: name.trim(), email: normalizedEmail, passwordHash, phone: phone.trim(), status: "PENDING" },
  });
  
  const otp = generateOtp();
  const challenge = await createChallenge({ userId: user.id, channel: "EMAIL", purpose: "REGISTRATION_EMAIL", otp });
  await sendEmailOtp({ email: user.email, otp });
  
  return { userId: user.id, challengeId: challenge.id, channel: "email", expiresAt: challenge.expiresAt };
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

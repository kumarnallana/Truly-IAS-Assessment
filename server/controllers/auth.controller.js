import crypto from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { env } from "../lib/env.js";
import { clearSessionCookie, sessionCookieName, sessionCookieOptions } from "../lib/auth.js";
import { revealTestOtp } from "../lib/test-otp.js";
import { loginChallengeSchema, loginOtpSchema, loginSchema } from "../lib/validation.js";
import {
  beginLogin,
  completeLogin,
  issueAccessToken,
  publicUser,
  revokeSession,
  startLoginChallenge,
  touchSession,
} from "../services/auth.service.js";

function noStore(res) {
  res.set("Cache-Control", "no-store");
  res.set("Pragma", "no-cache");
}

export async function login(req, res, next) {
  try {
    const result = await beginLogin(loginSchema.parse(req.body));
    noStore(res);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function createLoginChallenge(req, res, next) {
  try {
    const result = await startLoginChallenge(loginChallengeSchema.parse(req.body));
    noStore(res);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function verifyLoginOtp(req, res, next) {
  try {
    const result = await completeLogin(loginOtpSchema.parse(req.body));
    // A fresh random session is created only after MFA, so no pre-auth identifier can be fixed.
    clearSessionCookie(res);
    res.cookie(
      sessionCookieName(),
      result.sessionToken,
      sessionCookieOptions({ rememberMe: result.session.rememberMe, expiresAt: result.session.expiresAt }),
    );
    noStore(res);
    res.status(200).json({ authenticated: true, user: result.user, redirectTo: "/dashboard.html" });
  } catch (error) {
    next(error);
  }
}

export async function me(req, res, next) {
  try {
    await touchSession(req.auth.session.id);
    noStore(res);
    res.status(200).json({ authenticated: true, user: publicUser(req.auth.user) });
  } catch (error) {
    next(error);
  }
}

export async function logout(req, res, next) {
  try {
    await revokeSession(req.auth.session.id);
    clearSessionCookie(res);
    noStore(res);
    res.status(200).json({ loggedOut: true });
  } catch (error) {
    next(error);
  }
}

export async function token(req, res, next) {
  try {
    const result = await issueAccessToken(req.auth.session);
    noStore(res);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export function protectedResource(req, res) {
  noStore(res);
  res.status(200).json({
    message: "Protected SecureID API access granted.",
    user: req.bearerAuth.user,
    token: {
      issuer: req.bearerAuth.claims.iss,
      audience: req.bearerAuth.claims.aud,
      expiresAt: new Date(req.bearerAuth.claims.exp * 1000).toISOString(),
      jti: req.bearerAuth.claims.jti,
    },
  });
}

function safeEqual(left, right) {
  if (!left || !right) return false;
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export async function testOtp(req, res, next) {
  try {
    if (
      env.NODE_ENV === "production" ||
      !env.ENABLE_TEST_OTP ||
      !safeEqual(req.get("x-test-otp-key"), env.TEST_OTP_ACCESS_KEY)
    ) {
      return res.status(404).json({ message: "Not found." });
    }
    const challenge = await prisma.otpChallenge.findUnique({ where: { id: req.params.challengeId } });
    const otp = challenge ? revealTestOtp(challenge.testOtpEncrypted) : null;
    if (!challenge || !otp || challenge.consumedAt || challenge.expiresAt <= new Date()) {
      return res.status(404).json({ message: "Active test OTP not found." });
    }
    noStore(res);
    res.status(200).json({ challengeId: challenge.id, otp, expiresAt: challenge.expiresAt });
  } catch (error) {
    next(error);
  }
}


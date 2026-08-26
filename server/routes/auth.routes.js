import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  createLoginChallenge,
  login,
  logout,
  me,
  protectedResource,
  testOtp,
  token,
  verifyLoginOtp,
} from "../controllers/auth.controller.js";
import { requireBearer, requireSession } from "../middleware/auth.middleware.js";

const router = Router();

const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: "RATE_LIMITED", message: "Too many login attempts. Try again later." },
});

const verificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: "RATE_LIMITED", message: "Too many verification attempts. Try again later." },
});

const tokenLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: "RATE_LIMITED", message: "Too many token requests. Try again later." },
});

router.post("/login", credentialLimiter, login);
router.post("/login/challenge", verificationLimiter, createLoginChallenge);
router.post("/verify-login-otp", verificationLimiter, verifyLoginOtp);
router.get("/me", requireSession, me);
router.post("/logout", requireSession, logout);
router.post("/token", tokenLimiter, requireSession, token);
router.get("/protected", requireBearer, protectedResource);
router.get("/test/otp/:challengeId", testOtp);

export default router;


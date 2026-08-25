import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  selectMethod,
  verify,
  totpSetup,
  totpVerify,
} from "../controllers/mfa.controller.js";

const router = Router();

const mfaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // limit each IP to 30 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many MFA attempts, please try again later." },
});

router.post("/mfa/select-method", mfaLimiter, selectMethod);
router.post("/mfa/verify", mfaLimiter, verify);

// TOTP extensions
router.post("/mfa/totp/setup", mfaLimiter, totpSetup);
router.post("/mfa/totp/verify", mfaLimiter, totpVerify);

export default router;

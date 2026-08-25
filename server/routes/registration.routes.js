import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  register,
  verifyEmailOtp,
  sendEmailOtp,
  sendSmsOtp,
  verifySmsOtp,
} from "../controllers/registration.controller.js";

const router = Router();

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // limit each IP to 30 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many OTP attempts, please try again later." },
});

router.post("/register", register);
router.post("/send-email-otp", otpLimiter, sendEmailOtp);
router.post("/verify-email-otp", otpLimiter, verifyEmailOtp);
router.post("/send-sms-otp", otpLimiter, sendSmsOtp);
router.post("/verify-sms-otp", otpLimiter, verifySmsOtp);

export default router;

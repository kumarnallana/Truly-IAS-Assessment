import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as forgotPasswordController from "../controllers/forgot-password.controller.js";

const router = Router();

const requestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
});

const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
});

// Brute-force protection for password recovery endpoints
router.post(
  "/forgot-password/request",
  requestLimiter,
  forgotPasswordController.requestPasswordReset
);

router.post(
  "/forgot-password/reset",
  resetLimiter,
  forgotPasswordController.resetPassword
);

export default router;

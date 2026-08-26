import { z } from "zod";
import * as forgotPasswordService from "../services/forgot-password.service.js";
import { registerSchema } from "../lib/validation.js";

// Extract the exact password schema used in Registration
const passwordPolicy = registerSchema.shape.password;

const requestResetSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
});

const resetPasswordSchema = z.object({
  challengeId: z.string().cuid(),
  otp: z.string().length(6, "Code must be exactly 6 digits."),
  newPassword: passwordPolicy,
});

export async function requestPasswordReset(req, res, next) {
  try {
    const data = requestResetSchema.parse(req.body);
    const result = await forgotPasswordService.requestPasswordReset(data.email);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const data = resetPasswordSchema.parse(req.body);
    const result = await forgotPasswordService.resetPassword(data.challengeId, data.otp, data.newPassword);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

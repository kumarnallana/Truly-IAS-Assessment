import {
  registerUser,
  verifyRegistrationEmailOtp,
  sendRegistrationSmsOtp,
  verifyRegistrationSmsOtp,
  resendRegistrationEmailOtp,
} from "../services/registration.service.js";
import { registerSchema, otpSchema, sendOtpSchema } from "../lib/validation.js";

export async function register(req, res, next) {
  try {
    const data = registerSchema.parse(req.body);
    const result = await registerUser(data);
    res.status(result.resumed ? 200 : 201).json({
      message: result.resumed
        ? "Registration resumed. A new email verification code was sent."
        : "Registration created. Verify your email OTP.",
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyEmailOtp(req, res, next) {
  try {
    const data = otpSchema.parse(req.body);
    const result = await verifyRegistrationEmailOtp(data);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function sendEmailOtp(req, res, next) {
  try {
    const data = sendOtpSchema.parse(req.body);
    const result = await resendRegistrationEmailOtp(data);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function sendSmsOtp(req, res, next) {
  try {
    const data = sendOtpSchema.parse(req.body);
    const result = await sendRegistrationSmsOtp(data);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function verifySmsOtp(req, res, next) {
  try {
    const data = otpSchema.parse(req.body);
    const result = await verifyRegistrationSmsOtp(data);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

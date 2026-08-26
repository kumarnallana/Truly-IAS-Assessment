import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(100),
  email: z.string().trim().email("Please enter a valid email address.").max(320),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(72)
    .regex(/[A-Z]/, "Password must contain at least 1 uppercase letter.")
    .regex(/[0-9]/, "Password must contain at least 1 number.")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least 1 special character."),
  confirmPassword: z.string().optional(),
  phone: z.string().trim().min(7, "Phone number is too short.").max(20),
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: "Terms and Privacy Policy acceptance is required." }),
  }),
}).refine((data) => !data.confirmPassword || data.password === data.confirmPassword, {
  path: ["confirmPassword"],
  message: "Passwords do not match.",
});

export const otpSchema = z.object({
  userId: z.string().min(1, "User ID is required."),
  challengeId: z.string().min(1, "Challenge ID is required."),
  otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits."),
});

export const sendOtpSchema = z.object({
  userId: z.string().min(1, "User ID is required."),
});

export const mfaSelectSchema = z.object({
  userId: z.string().min(1, "User ID is required."),
  method: z.enum(["AUTHENTICATOR", "SMS", "EMAIL"]),
});

export const mfaVerifySchema = z.object({
  userId: z.string().min(1, "User ID is required."),
  method: z.enum(["AUTHENTICATOR", "SMS", "EMAIL"]),
  code: z.string().regex(/^\d{6}$/, "Code must be 6 digits."),
  challengeId: z.string().optional(),
});

export const totpSetupSchema = z.object({
  userId: z.string().min(1, "User ID is required."),
});

export const totpVerifySchema = z.object({
  userId: z.string().min(1, "User ID is required."),
  code: z.string().regex(/^\d{6}$/, "Code must be 6 digits."),
  challengeId: z.string().optional(),
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Email or username is required.").max(320),
  password: z.string().min(1, "Password is required.").max(72),
  rememberMe: z.boolean().default(false),
});

export const loginChallengeSchema = z.object({
  loginToken: z.string().min(32, "Login transaction is required."),
  method: z.enum(["AUTHENTICATOR", "SMS", "EMAIL"]),
});

export const loginOtpSchema = z.object({
  loginToken: z.string().min(32, "Login transaction is required."),
  method: z.enum(["AUTHENTICATOR", "SMS", "EMAIL"]),
  challengeId: z.string().min(1, "Challenge ID is required."),
  otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits."),
});

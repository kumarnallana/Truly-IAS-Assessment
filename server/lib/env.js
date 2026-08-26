import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  OTP_SECRET: z.string().min(32),
  TOTP_ENCRYPTION_KEY: z.string().length(64, "Key must be 64 hex characters (32 bytes) for AES-256-GCM"),
  JWT_SECRET: z.string().min(32).optional(),
  JWT_ISSUER: z.string().min(1).default("secureid"),
  JWT_AUDIENCE: z.string().min(1).default("secureid-api"),
  JWT_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(600),
  OTP_TTL_SECONDS: z.coerce.number().int().min(60).max(900).default(300),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(5),
  LOGIN_TRANSACTION_TTL_SECONDS: z.coerce.number().int().min(60).max(900).default(600),
  LOGIN_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(20).default(5),
  LOGIN_LOCKOUT_SECONDS: z.coerce.number().int().min(60).max(86400).default(900),
  SESSION_TTL_SECONDS: z.coerce.number().int().min(300).max(86400).default(28800),
  REMEMBER_SESSION_TTL_SECONDS: z.coerce.number().int().min(3600).max(31536000).default(2592000),
  ENABLE_TEST_OTP: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  TEST_OTP_ACCESS_KEY: z.string().min(16).optional(),
  CLIENT_ORIGIN: z.string().url().default("http://localhost:4000"),
  COOKIE_SECURE: z.enum(["true", "false"]).optional().transform((value) => value === undefined ? undefined : value === "true"),
  PORT: z.coerce.number().int().default(4000),
}).superRefine((value, context) => {
  if (value.NODE_ENV === "production" && !value.JWT_SECRET) {
    context.addIssue({ code: "custom", path: ["JWT_SECRET"], message: "JWT_SECRET is required in production." });
  }
  if (value.ENABLE_TEST_OTP && !value.TEST_OTP_ACCESS_KEY) {
    context.addIssue({ code: "custom", path: ["TEST_OTP_ACCESS_KEY"], message: "TEST_OTP_ACCESS_KEY is required when test OTP retrieval is enabled." });
  }
});

const parsed = schema.parse(process.env);

export const env = {
  ...parsed,
  // Development remains easy to run; production must provide an independent key.
  JWT_SECRET: parsed.JWT_SECRET ?? `${parsed.OTP_SECRET}:development-jwt-only`,
  COOKIE_SECURE: parsed.COOKIE_SECURE ?? parsed.NODE_ENV === "production",
};

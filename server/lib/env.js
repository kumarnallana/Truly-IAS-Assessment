import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  OTP_SECRET: z.string().min(32),
  TOTP_ENCRYPTION_KEY: z.string().length(64, "Key must be 64 hex characters (32 bytes) for AES-256-GCM"),
  OTP_TTL_SECONDS: z.coerce.number().int().min(60).max(900).default(300),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(5),
  CLIENT_ORIGIN: z.string().url().default("http://localhost:4000"),
  PORT: z.coerce.number().int().default(4000),
});

export const env = schema.parse(process.env);

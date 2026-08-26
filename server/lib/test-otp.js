import { env } from "./env.js";
import { decryptSecret, encryptSecret } from "./totp.js";

export function protectTestOtp(otp) {
  if (!env.ENABLE_TEST_OTP || env.NODE_ENV === "production") return null;
  return encryptSecret(otp, env.TOTP_ENCRYPTION_KEY);
}

export function revealTestOtp(encryptedOtp) {
  if (!env.ENABLE_TEST_OTP || env.NODE_ENV === "production" || !encryptedOtp) return null;
  return decryptSecret(encryptedOtp, env.TOTP_ENCRYPTION_KEY);
}


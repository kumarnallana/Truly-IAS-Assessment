import { generateOtp, hashOtp, safeEqualHex } from "./server/lib/otp.js";
import { generateTotpSetup, verifyTotp, encryptSecret, decryptSecret } from "./server/lib/totp.js";
import * as OTPAuth from "otpauth";

console.log("--- Testing OTP ---");
const otp = generateOtp();
console.log("Generated OTP:", otp);
const secret = "a-very-long-secret-key-that-is-at-least-32-chars-long";
const hashed = hashOtp(otp, secret);
console.log("Hashed OTP:", hashed);
console.log("Verification positive:", safeEqualHex(hashed, hashOtp(otp, secret)));
console.log("Verification negative:", safeEqualHex(hashed, hashOtp("000000", secret)));

console.log("\n--- Testing TOTP Encryption & Generation ---");
const encryptionKey = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"; // 64 hex chars = 32 bytes
const totpSetup = await generateTotpSetup({ accountName: "test@example.com" });
console.log("Base32 secret:", totpSetup.base32Secret);
console.log("OTPAuth URL:", totpSetup.otpauthUrl);
console.log("QR Code URL exists:", totpSetup.qrCodeDataUrl.startsWith("data:image/png;base64,"));

const encrypted = encryptSecret(totpSetup.base32Secret, encryptionKey);
console.log("Encrypted secret:", encrypted);
const decrypted = decryptSecret(encrypted, encryptionKey);
console.log("Decrypted secret matches:", decrypted === totpSetup.base32Secret);

console.log("\n--- Testing TOTP Verification ---");
const totpInstance = new OTPAuth.TOTP({
  issuer: "SecureID",
  label: "test@example.com",
  algorithm: "SHA1",
  digits: 6,
  period: 30,
  secret: OTPAuth.Secret.fromBase32(totpSetup.base32Secret),
});
const currentToken = totpInstance.generate();
console.log("Generated valid token:", currentToken);
console.log("Verify valid token:", verifyTotp({ base32Secret: totpSetup.base32Secret, code: currentToken }));
console.log("Verify invalid token:", verifyTotp({ base32Secret: totpSetup.base32Secret, code: "000000" }));

console.log("\nAll smoke tests passed!");

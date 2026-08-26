import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import crypto from "node:crypto";

const ALGO = "aes-256-gcm";

export function encryptSecret(plainSecret, keyHex) {
  const key = Buffer.from(keyHex, "hex");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plainSecret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("hex"), tag.toString("hex"), enc.toString("hex")].join(".");
}

export function decryptSecret(payload, keyHex) {
  const [ivHex, tagHex, dataHex] = payload.split(".");
  const key = Buffer.from(keyHex, "hex");
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const dec = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
  return dec.toString("utf8");
}

export async function generateTotpSetup({ accountName, issuer = "SecureID" }) {
  const secret = new OTPAuth.Secret({ size: 20 });
  const totp = new OTPAuth.TOTP({ issuer, label: accountName, algorithm: "SHA1", digits: 6, period: 30, secret });
  const otpauthUrl = totp.toString();
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
  return { base32Secret: secret.base32, otpauthUrl, qrCodeDataUrl };
}

export function verifyTotp({ base32Secret, code }) {
  return verifyTotpCounter({ base32Secret, code }) !== null;
}

export function verifyTotpCounter({ base32Secret, code, timestamp = Date.now() }) {
  const totp = new OTPAuth.TOTP({ algorithm: "SHA1", digits: 6, period: 30, secret: OTPAuth.Secret.fromBase32(base32Secret) });
  const delta = totp.validate({ token: code, window: 1, timestamp }); // allows -1/0/+1 time-step drift
  if (delta === null) return null;
  return Math.floor(timestamp / 1000 / 30) + delta;
}

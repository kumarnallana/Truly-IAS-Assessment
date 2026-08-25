import { apiRequest } from "./api.js";

export async function selectMfaMethod(userId, method) {
  return apiRequest("/mfa/select-method", {
    method: "POST",
    body: { userId, method },
  });
}

export async function verifyMfaCode({ userId, method, code, challengeId }) {
  return apiRequest("/mfa/verify", {
    method: "POST",
    body: { userId, method, code, challengeId },
  });
}

export async function setupTotp(userId) {
  return apiRequest("/mfa/totp/setup", {
    method: "POST",
    body: { userId },
  });
}

export async function verifyTotpCode({ userId, code, challengeId }) {
  return apiRequest("/mfa/totp/verify", {
    method: "POST",
    body: { userId, code, challengeId },
  });
}

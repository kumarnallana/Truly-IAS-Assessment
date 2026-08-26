import crypto from "node:crypto";
import { env } from "./env.js";

const SESSION_COOKIE_BASE = "secureid.sid";

function encodeJson(value) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function decodeJson(value) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}

function safeEqualText(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function createOpaqueToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashOpaqueToken(token) {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

export function sessionCookieName() {
  return env.COOKIE_SECURE ? `__Host-${SESSION_COOKIE_BASE}` : SESSION_COOKIE_BASE;
}

export function parseCookies(header = "") {
  return header.split(";").reduce((cookies, pair) => {
    const separatorIndex = pair.indexOf("=");
    if (separatorIndex < 0) return cookies;
    const name = pair.slice(0, separatorIndex).trim();
    const value = pair.slice(separatorIndex + 1).trim();
    if (!name) return cookies;
    try {
      cookies[name] = decodeURIComponent(value);
    } catch {
      cookies[name] = value;
    }
    return cookies;
  }, {});
}

export function sessionCookieOptions({ rememberMe = false, expiresAt } = {}) {
  const options = {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: "lax",
    path: "/",
  };
  if (rememberMe && expiresAt) options.expires = expiresAt;
  return options;
}

export function clearSessionCookie(res) {
  res.clearCookie(sessionCookieName(), sessionCookieOptions());
}

export function signAccessToken({ userId, jti, issuedAt = new Date() }) {
  const issuedAtSeconds = Math.floor(issuedAt.getTime() / 1000);
  const expiresAtSeconds = issuedAtSeconds + env.JWT_TTL_SECONDS;
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    iss: env.JWT_ISSUER,
    sub: userId,
    aud: env.JWT_AUDIENCE,
    iat: issuedAtSeconds,
    exp: expiresAtSeconds,
    jti,
  };
  const signingInput = `${encodeJson(header)}.${encodeJson(payload)}`;
  const signature = crypto.createHmac("sha256", env.JWT_SECRET).update(signingInput).digest("base64url");
  return {
    token: `${signingInput}.${signature}`,
    payload,
    expiresAt: new Date(expiresAtSeconds * 1000),
  };
}

export function verifyAccessToken(token, now = new Date()) {
  if (typeof token !== "string") throw new Error("Invalid access token.");
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid access token.");

  const [encodedHeader, encodedPayload, signature] = parts;
  let header;
  let payload;
  try {
    header = decodeJson(encodedHeader);
    payload = decodeJson(encodedPayload);
  } catch {
    throw new Error("Invalid access token.");
  }

  if (header.alg !== "HS256" || header.typ !== "JWT") throw new Error("Invalid access token algorithm.");
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const expected = crypto.createHmac("sha256", env.JWT_SECRET).update(signingInput).digest("base64url");
  if (!safeEqualText(signature, expected)) throw new Error("Invalid access token signature.");

  const nowSeconds = Math.floor(now.getTime() / 1000);
  if (payload.iss !== env.JWT_ISSUER || payload.aud !== env.JWT_AUDIENCE) {
    throw new Error("Invalid access token scope.");
  }
  if (!Number.isInteger(payload.iat) || payload.iat > nowSeconds + 60) throw new Error("Invalid access token issue time.");
  if (!Number.isInteger(payload.exp) || payload.exp <= nowSeconds) throw new Error("Access token expired.");
  if (typeof payload.sub !== "string" || !payload.sub || typeof payload.jti !== "string" || !payload.jti) {
    throw new Error("Invalid access token claims.");
  }

  return payload;
}


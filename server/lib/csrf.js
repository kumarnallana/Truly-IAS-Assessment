import crypto from "node:crypto";
import { env } from "./env.js";
import { parseCookies } from "./auth.js";

const CSRF_COOKIE = "secureid.csrf";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function requestOrigin(req) {
  const protocol = req.get("x-forwarded-proto")?.split(",")[0]?.trim() || req.protocol;
  const host = req.get("x-forwarded-host")?.split(",")[0]?.trim() || req.get("host");
  return host ? `${protocol}://${host}` : null;
}

function isAllowedOrigin(origin, req) {
  return origin === env.CLIENT_ORIGIN || origin === requestOrigin(req);
}

function safeEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string") return false;
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function issueCsrfToken(req, res) {
  const token = crypto.randomBytes(32).toString("base64url");
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: env.COOKIE_SECURE,
    sameSite: "lax",
    path: "/",
  });
  res.set("Cache-Control", "no-store");
  res.status(200).json({ csrfToken: token });
}

export function requireCsrf(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.get("origin");
  const referer = req.get("referer");
  if (origin && !isAllowedOrigin(origin, req)) {
    return res.status(403).json({ code: "ORIGIN_REJECTED", message: "Request origin is not allowed." });
  }
  if (!origin && referer) {
    try {
      if (!isAllowedOrigin(new URL(referer).origin, req)) {
        return res.status(403).json({ code: "ORIGIN_REJECTED", message: "Request origin is not allowed." });
      }
    } catch {
      return res.status(403).json({ code: "ORIGIN_REJECTED", message: "Request origin is not allowed." });
    }
  }

  const cookieToken = parseCookies(req.get("cookie"))[CSRF_COOKIE];
  const headerToken = req.get("x-csrf-token");
  if (!safeEqual(cookieToken, headerToken)) {
    return res.status(403).json({ code: "CSRF_VALIDATION_FAILED", message: "CSRF validation failed. Refresh and try again." });
  }

  next();
}


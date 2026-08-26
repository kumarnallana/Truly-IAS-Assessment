import { clearSessionCookie, parseCookies, sessionCookieName } from "../lib/auth.js";
import { findActiveSession, validateBearerToken } from "../services/auth.service.js";

export async function requireSession(req, res, next) {
  try {
    const token = parseCookies(req.get("cookie"))[sessionCookieName()];
    const session = await findActiveSession(token);
    if (!session) {
      clearSessionCookie(res);
      return res.status(401).json({ code: "SESSION_REQUIRED", message: "Authentication is required." });
    }
    req.auth = { session, user: session.user };
    next();
  } catch (error) {
    next(error);
  }
}

export async function requireBearer(req, res, next) {
  try {
    const authorization = req.get("authorization") || "";
    const match = authorization.match(/^Bearer\s+([^\s]+)$/i);
    if (!match) {
      return res.status(401).json({ code: "BEARER_TOKEN_REQUIRED", message: "A bearer token is required." });
    }
    req.bearerAuth = await validateBearerToken(match[1]);
    next();
  } catch (error) {
    next(error);
  }
}


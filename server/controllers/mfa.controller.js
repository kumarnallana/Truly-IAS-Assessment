import { selectMfaMethod, verifyMfa } from "../services/mfa.service.js";
import {
  mfaSelectSchema,
  mfaVerifySchema,
  totpSetupSchema,
  totpVerifySchema,
} from "../lib/validation.js";

export async function selectMethod(req, res, next) {
  try {
    const data = mfaSelectSchema.parse(req.body);
    const result = await selectMfaMethod(data);
    const statusCode = data.method === "AUTHENTICATOR" ? 200 : 201;
    res.status(statusCode).json(result);
  } catch (error) {
    next(error);
  }
}

export async function verify(req, res, next) {
  try {
    const data = mfaVerifySchema.parse(req.body);
    const result = await verifyMfa(data);
    res.status(200).json({ message: "MFA enabled. Registration complete.", ...result });
  } catch (error) {
    next(error);
  }
}

// Extension endpoints for TOTP specific routing
export async function totpSetup(req, res, next) {
  try {
    const data = totpSetupSchema.parse(req.body);
    const result = await selectMfaMethod({ userId: data.userId, method: "AUTHENTICATOR" });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function totpVerify(req, res, next) {
  try {
    const data = totpVerifySchema.parse(req.body);
    const result = await verifyMfa({
      userId: data.userId,
      method: "AUTHENTICATOR",
      code: data.code,
      challengeId: data.challengeId,
    });
    res.status(200).json({ message: "MFA enabled. Registration complete.", ...result });
  } catch (error) {
    next(error);
  }
}

import assert from "node:assert/strict";
import test from "node:test";

test("registration, MFA, session, JWT, and logout work against PostgreSQL", { timeout: 120_000 }, async () => {
  process.env.NODE_ENV = "test";
  process.env.ENABLE_TEST_OTP = "true";
  process.env.TEST_OTP_ACCESS_KEY = "secureid-integration-test-key";
  process.env.COOKIE_SECURE = "false";
  process.env.PORT = "0";

  const [{ default: app }, { prisma }] = await Promise.all([
    import("../../server/app.js"),
    import("../../server/lib/prisma.js"),
  ]);

  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const cookies = new Map();
  let csrfToken = "";
  let userId = null;

  function storeCookies(response) {
    const rawCookies = response.headers.getSetCookie?.() ?? [response.headers.get("set-cookie")].filter(Boolean);
    for (const rawCookie of rawCookies) {
      const pair = rawCookie.slice(0, rawCookie.indexOf(";"));
      const separator = pair.indexOf("=");
      if (separator < 1) continue;
      const name = pair.slice(0, separator);
      const value = pair.slice(separator + 1);
      if (value) cookies.set(name, value);
      else cookies.delete(name);
    }
  }

  async function request(path, { method = "GET", body, headers = {}, expected = 200 } = {}) {
    const requestHeaders = { accept: "application/json", ...headers };
    if (cookies.size) {
      requestHeaders.cookie = Array.from(cookies, ([name, value]) => `${name}=${value}`).join("; ");
    }
    if (body !== undefined) {
      requestHeaders["content-type"] = "application/json";
      requestHeaders["x-csrf-token"] = csrfToken;
    }

    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    storeCookies(response);
    const payload = await response.json();
    assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(payload)}`);
    return payload;
  }

  async function readOtp(challengeId) {
    return request(`/api/test/otp/${challengeId}`, {
      headers: { "x-test-otp-key": process.env.TEST_OTP_ACCESS_KEY },
    });
  }

  try {
    const csrf = await request("/api/csrf");
    csrfToken = csrf.csrfToken;
    assert.equal(typeof csrfToken, "string");
    assert.ok(csrfToken.length >= 32);

    const unique = `${Date.now()}-${process.pid}`;
    const email = `secureid.integration.${unique}@example.test`;
    const password = "SecureID!2026";

    const registration = await request("/api/register", {
      method: "POST",
      expected: 201,
      body: { name: "Integration User", email, password, phone: "+91 98765 43210" },
    });
    userId = registration.userId;

    const emailOtp = await readOtp(registration.challengeId);
    await request("/api/verify-email-otp", {
      method: "POST",
      body: { userId, challengeId: registration.challengeId, otp: emailOtp.otp },
    });

    const smsChallenge = await request("/api/send-sms-otp", {
      method: "POST",
      expected: 201,
      body: { userId },
    });
    const smsOtp = await readOtp(smsChallenge.challengeId);
    await request("/api/verify-sms-otp", {
      method: "POST",
      body: { userId, challengeId: smsChallenge.challengeId, otp: smsOtp.otp },
    });

    const mfaChallenge = await request("/api/mfa/select-method", {
      method: "POST",
      expected: 201,
      body: { userId, method: "EMAIL" },
    });
    const mfaOtp = await readOtp(mfaChallenge.challengeId);
    await request("/api/mfa/verify", {
      method: "POST",
      body: { userId, challengeId: mfaChallenge.challengeId, method: "EMAIL", code: mfaOtp.otp },
    });

    const login = await request("/api/login", {
      method: "POST",
      body: { identifier: email, password, rememberMe: true },
    });
    assert.equal(login.mfaRequired, true);
    assert.ok(login.methods.some(({ method }) => method === "EMAIL"));

    const loginChallenge = await request("/api/login/challenge", {
      method: "POST",
      expected: 201,
      body: { loginToken: login.loginToken, method: "EMAIL" },
    });
    const loginOtp = await readOtp(loginChallenge.challengeId);
    const authenticated = await request("/api/verify-login-otp", {
      method: "POST",
      body: {
        loginToken: login.loginToken,
        method: "EMAIL",
        challengeId: loginChallenge.challengeId,
        otp: loginOtp.otp,
      },
    });
    assert.equal(authenticated.authenticated, true);
    assert.ok(Array.from(cookies.keys()).some((name) => name.endsWith("secureid.sid")));

    const me = await request("/api/me");
    assert.equal(me.user.email, email);
    assert.equal(me.user.mfaEnabled, true);

    const issued = await request("/api/token", { method: "POST", expected: 201, body: {} });
    assert.equal(issued.tokenType, "Bearer");
    assert.equal(typeof issued.accessToken, "string");

    const protectedResult = await request("/api/protected", {
      headers: { authorization: `Bearer ${issued.accessToken}` },
    });
    assert.equal(protectedResult.user.email, email);

    await request("/api/logout", { method: "POST", body: {} });
    await request("/api/me", { expected: 401 });
    await request("/api/protected", {
      expected: 401,
      headers: { authorization: `Bearer ${issued.accessToken}` },
    });
  } finally {
    if (userId) {
      await prisma.user.deleteMany({ where: { id: userId } });
    }
    await prisma.$disconnect();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

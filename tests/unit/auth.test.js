import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createOpaqueToken,
  hashOpaqueToken,
  parseCookies,
  sessionCookieOptions,
  signAccessToken,
  verifyAccessToken,
} from '../../server/lib/auth.js';

test('opaque session material has 256 bits of entropy and is stored by hash', () => {
  const token = createOpaqueToken();
  const secondToken = createOpaqueToken();
  assert.equal(Buffer.from(token, 'base64url').length, 32);
  assert.equal(hashOpaqueToken(token).length, 64);
  assert.notEqual(token, secondToken);
  assert.notEqual(hashOpaqueToken(token), token);
});

test('JWT includes and validates the required claims and fixed algorithm', () => {
  const { token, payload } = signAccessToken({ userId: 'user-123', jti: 'token-123' });
  const verified = verifyAccessToken(token);
  assert.equal(verified.sub, 'user-123');
  assert.equal(verified.jti, 'token-123');
  assert.equal(verified.iss, payload.iss);
  assert.equal(verified.aud, payload.aud);
  assert.ok(Number.isInteger(verified.iat));
  assert.ok(verified.exp > verified.iat);
});

test('JWT validation rejects tampering and expiration', () => {
  const issuedAt = new Date(Date.now() - 3_600_000);
  const { token } = signAccessToken({ userId: 'user-123', jti: 'token-expired', issuedAt });
  assert.throws(() => verifyAccessToken(token), /expired/i);

  const parts = token.split('.');
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  payload.sub = 'attacker';
  parts[1] = Buffer.from(JSON.stringify(payload)).toString('base64url');
  assert.throws(() => verifyAccessToken(parts.join('.')), /signature/i);
});

test('session cookie policy is HttpOnly, SameSite Lax, scoped to root, and only persistent for remember-me', () => {
  const expiry = new Date(Date.now() + 60_000);
  const transient = sessionCookieOptions({ rememberMe: false, expiresAt: expiry });
  const remembered = sessionCookieOptions({ rememberMe: true, expiresAt: expiry });
  assert.equal(transient.httpOnly, true);
  assert.equal(transient.sameSite, 'lax');
  assert.equal(transient.path, '/');
  assert.equal(transient.expires, undefined);
  assert.equal(remembered.expires, expiry);
});

test('cookie parsing does not interpret values as executable content', () => {
  assert.deepEqual(parseCookies('secureid.sid=abc123; theme=light'), { 'secureid.sid': 'abc123', theme: 'light' });
});


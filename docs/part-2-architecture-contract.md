# SecureID Part 2 — Architecture and Security Contract

Status: implemented on 26 August 2026.

## Scope decision

SecureID is a first-party authentication application. It implements local password authentication, MFA, an opaque server-side browser session, and a separate short-lived JWT demonstration. It does not claim to be an OAuth 2.0 authorization server, an OpenID Provider, or a SAML Identity Provider.

The supplied implementation guideline requires `POST /api/token`, but does not require that endpoint to accept a password. SecureID therefore uses the safer interpretation:

```text
email + password -> short-lived pre-auth transaction -> MFA
                 -> new opaque server session -> POST /api/token
                 -> short-lived JWT -> GET /api/protected
```

`POST /api/token` is a session-to-token exchange after MFA. The password is never submitted to the token endpoint. This avoids reproducing the Resource Owner Password Credentials pattern that RFC 9700 Section 2.4 says must not be used.

## Assessment requirement versus production recommendation

| Item | Assessment implementation | Production recommendation |
|---|---|---|
| Registration and MFA | Backend-generated email/SMS OTP plus selectable MFA | Connect an audited delivery provider and recovery process |
| Browser authentication | Server-side session after password + MFA | Keep; add centralized session monitoring and device management |
| Remember me | Longer server-side session expiry | Keep with device/session revocation UI and risk-based checks |
| `/api/token` | Authenticated session exchanges for a 10-minute JWT | Use an established authorization server if third-party delegation is required |
| JWT validation | Fixed HS256, `iss`, `sub`, `aud`, `iat`, `exp`, `jti`, grant/session status | Move to asymmetric keys and documented rotation when services separate |
| OAuth2/OIDC/SAML | Educational context only | Add only for a concrete federation/delegation requirement |
| Google sign-in | Reference UI control; intentionally inactive | Add OIDC Authorization Code + PKCE only when requested and configured |
| Forgot password | Reference UI control; explicitly out of scope | Build a separate, rate-limited, single-use recovery flow |

## Required APIs

| Method | Route | Contract |
|---|---|---|
| POST | `/api/register` | Validate, hash password, create pending user and email challenge |
| POST | `/api/send-email-otp` | Replace the active registration email challenge |
| POST | `/api/verify-email-otp` | Consume a correct registration email OTP |
| POST | `/api/send-sms-otp` | Create the registration SMS challenge |
| POST | `/api/verify-sms-otp` | Consume a correct registration SMS OTP |
| POST | `/api/login` | Validate credentials and create a short-lived pre-auth transaction |
| POST | `/api/login/challenge` | Select email, SMS, or enrolled authenticator MFA and create its challenge |
| POST | `/api/verify-login-otp` | Consume MFA, invalidate pre-auth state, and create a new server session |
| GET | `/api/me` | Return the authenticated session user |
| POST | `/api/logout` | Revoke the session and every JWT grant issued from it |
| POST | `/api/token` | Exchange the MFA-authenticated session for a short-lived JWT |
| GET | `/api/protected` | Validate bearer signature, algorithm, claims, grant, user, and parent session |
| GET | `/api/csrf` | Issue the double-submit CSRF token used by browser POST requests |

`POST /api/login/challenge` is the one extension to the minimum route list. It is necessary because the supplied login reference has a distinct MFA-method selection screen; credentials are not retained or resubmitted when that choice is made.

## Session contract

- The browser receives an opaque 256-bit random session identifier. Only its SHA-256 hash is stored in the database.
- No authenticated session exists before MFA. Successful MFA consumes the pre-authentication transaction and creates unrelated random session material, preventing session fixation.
- Cookie policy is `HttpOnly`, `SameSite=Lax`, `Path=/`, and `Secure` in production. With `Secure`, the cookie uses a `__Host-` name.
- Without Remember Me, the cookie has no `Expires` attribute and the server record lasts eight hours by default.
- With Remember Me, both cookie and server record expire after 30 days by default.
- Logout revokes the database session and JWT grants derived from it, then expires the cookie.
- Authentication material is never stored in `localStorage` or `sessionStorage`.

## CSRF and origin contract

Every state-changing `/api` request requires a double-submit token: `GET /api/csrf` sets a SameSite cookie and returns the same unpredictable value; the browser echoes it in `X-CSRF-Token`. The server performs a timing-safe comparison. When `Origin` or `Referer` is present, it must also match the configured or current application origin. CORS is allow-listed rather than reflected.

## Login and MFA contract

- Unknown email, wrong password, locked account, inactive account, and incomplete registration share the public `INVALID_CREDENTIALS` response. This avoids login account enumeration.
- Password comparison still executes against a fixed bcrypt hash for unknown users to reduce timing differences.
- Repeated password failures create a temporary account lock. IP-based rate limiting provides a second layer.
- The pre-authentication token is random, stored only by hash, expires in ten minutes by default, is held only in page memory, and is single-use.
- Email/SMS OTPs are generated with a cryptographically secure server RNG, stored as keyed hashes, expire, have bounded attempts, are invalidated on resend, and are consumed once.
- TOTP secrets are encrypted at rest with AES-256-GCM. A successful TOTP counter is recorded so the same time-step cannot be replayed.

## JWT contract

The token contains `iss`, `sub`, `aud`, `iat`, `exp`, and `jti`. Validation fixes the accepted algorithm to HS256 and verifies signature, issuer, audience, time claims, subject, and token ID. The `jti` is backed by an `AccessToken` record linked to the user and parent session, so logout/revocation takes effect before token expiry. The default lifetime is ten minutes.

The current HMAC design is proportionate to this single-server assessment. `JWT_SECRET` is mandatory in production and must be an independent, randomly generated secret. Asymmetric signing and formal key rotation are future requirements if issuer and resource server become separate systems.

## Threat model

| Threat | Implemented mitigation | Residual/production work |
|---|---|---|
| Credential stuffing/brute force | bcrypt, generic failures, per-account lockout, IP rate limit | Adaptive risk signals and breached-password screening |
| Account enumeration | Generic login response and dummy bcrypt comparison | Review registration/recovery disclosure policy |
| Session fixation | No pre-auth session; fresh random session only after MFA | Automated fixation regression in a deployed HTTPS environment |
| Session theft | Opaque high-entropy ID, hash-at-rest, HttpOnly/Secure/SameSite, expiry/revocation | Device binding/anomaly detection where appropriate |
| CSRF | Double-submit token plus Origin/Referer checks and SameSite | Reassess if cross-site flows are added |
| OTP brute force | Per-challenge attempt limit and route rate limit | Central distributed rate limiting at scale |
| OTP replay | `consumedAt`, resend invalidation, TOTP counter replay check | Recovery-code replay controls if recovery is added |
| JWT theft/replay | Short expiry, fixed audience, in-memory browser use, jti grant and logout revocation | Sender-constrained tokens if used across trust boundaries |
| Token leakage | No URL/local storage, no token logging, `Cache-Control: no-store` | Secret scanning and log redaction at the platform layer |
| TOTP secret leakage | AES-256-GCM at rest; plaintext disclosed only during enrollment | Managed KMS/HSM and rotation in production |

## Test-only OTP retrieval

Simulated delivery always writes the OTP to the server console. Optional automated retrieval is disabled by default. It is available only when all of the following are true:

- `NODE_ENV` is not `production`;
- `ENABLE_TEST_OTP=true`;
- `TEST_OTP_ACCESS_KEY` is configured and supplied in `X-Test-OTP-Key`.

In that mode the database stores an AES-256-GCM encrypted test copy, never plaintext, and `GET /api/test/otp/:challengeId` returns only an active code. The route deliberately behaves as not found in production.

## Data and deployment

Prisma models cover users, OTP challenges, pre-auth login transactions, server sessions, and JWT grants. A complete PostgreSQL migration is committed under `prisma/migrations` for a fresh database. For an existing schema originally created with `prisma db push`, baseline it before adopting migration history, or apply this additive schema with `npm run db:push` after taking a backup.

Required production configuration is documented in `.env.example`. The checked-in `.env` currently contains a placeholder database URL and is not a deployable database configuration.

## Security references

- [RFC 9700 — OAuth 2.0 Security Best Current Practice](https://www.rfc-editor.org/info/rfc9700/)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OWASP REST Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html)


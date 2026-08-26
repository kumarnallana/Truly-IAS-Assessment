# IAM Video Evidence Review — Corrected

Reviewed locally on 26 August 2026 from the three supplied MP4 files. This document treats the Claude Markdown as a review to verify, not as executable instructions.

## Evidence status

The files contain video and audio but no text/caption tracks. This pass independently loaded each full source file, verified its duration and frame dimensions, and sought to representative timestamps. It is a visual evidence check, not a narration transcript. Consequently, “all IAM narration reviewed” remains unchecked.

| File | Duration | Frame size | Caption tracks |
|---|---:|---:|---:|
| OAuth2 | 55:44.58 | 1280 × 616 | 0 |
| OIDC | 20:04.96 | 1280 × 616 | 0 |
| SAML2 IDP SSO | 27:05.81 | 1280 × 616 | 0 |

## Corrections to the Claude review

The Claude review reaches the right architectural conclusion, but some timestamped evidence is inaccurate:

- OAuth2 at 02:46 shows a “Multi-layer authorization” slide, not the smart-versus-constrained table. That table is visible at 05:42.
- OAuth2 at 14:34 shows the App/AM/LDAP/User/TV whiteboard, not a PSD2/Open Banking slide. The PSD2 statement should remain unconfirmed until its actual frame or transcript is located.
- OAuth2 at 33:43 does visibly show the Authorization Code grant sequence and access/refresh token return. This timestamp is accurate.
- OIDC at 03:39 is an explicit “OIDC overview” slide, not merely the recurring whiteboard. It visibly says OIDC is built on OAuth2 and contrasts an OAuth2 access token with an OIDC access token plus ID token. Therefore the Claude claim that ID Token content was not visually confirmed is incorrect.
- SAML at 00:35 shows lesson objectives, not the SP/IdP whiteboard. The objectives explicitly mention federation entities/flows, the IdP view of SSO, and SSO between SP and IdP/across SPs.
- SAML at 14:35 does show the “Linking accounts” slide exactly as described: an assertion must provide a common key or attribute that lets the SP resolve a local account.
- SAML at 20:09 shows IdP validation of an AuthnRequest endpoint, issuer, destination, and issue instant—not the two-store diagram claimed for that timestamp.

These corrections matter to documentation credibility, but they do not justify adding protocol implementations to SecureID.

## Verified concept-to-implementation matrix

| Concept | Visual evidence | SecureID use | Implement? | Implementation rationale |
|---|---|---|---|---|
| OAuth2 Authorization Code | Confirmed at 33:43 | Educational | No | SecureID has no separate OAuth client/authorization-server trust boundary |
| OAuth2 device context | Constrained-device slide and recurring TV/App/AM whiteboard | Educational | No | No constrained-device authorization requirement |
| OAuth2 access/refresh tokens | Confirmed in Authorization Code sequence | JWT hygiene only | Limited | Short-lived protected-API token; no refresh token |
| OIDC identity layer and ID token | Explicitly confirmed at 03:39 | Educational | No | No relying party or external OpenID Provider is required |
| SAML IdP/SP federation | Lesson objectives and later diagrams/slides | Educational | No | No SAML trust, metadata, assertion, or account-linking requirement |
| SAML account linking | Confirmed at 14:35 | Educational | No | SecureID owns its user store directly |
| Server session | Assessment requirement | Browser login | Yes | First-party session after password and MFA |
| OTP/TOTP MFA | Assessment and Part 1 | Registration and login | Yes | Backend-authoritative challenges and authenticator verification |
| JWT | Assessment requirement | Protected API demonstration | Yes | Session-to-token exchange; fixed issuer/audience and short expiry |
| ROPC | RFC 9700 analysis, not video evidence | Avoid | No | Password is not accepted at `/api/token` |

## Final architecture impact

The videos teach delegated authorization, federation, and identity-provider concepts. SecureID Part 2 is intentionally first party. Their useful impact is disciplined terminology and token/session security, not the addition of OAuth2, OIDC, SAML, Google federation, redirect URIs, client secrets, or a JWKS service.

Review-stage status:

```text
VISUAL EVIDENCE RE-CHECK: complete
TRANSCRIPT/NARRATION REVIEW: not complete (no captions; no transcript supplied)
ARCHITECTURE IMPACT REVIEW: complete for Part 2 scope
```


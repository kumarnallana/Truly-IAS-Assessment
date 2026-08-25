# SecureID UI Reference Map

This document tracks the 18 logical states of the SecureID authentication flow (12 Registration, 6 Login) against the 30 visual reference panels provided in the original design handoff.

**Total Logical States:** 18
**Total Baseline Permutations:** 36 (18 states × 2 breakpoints)
**Total Reference Panels:** 30

## Registration (12 Logical States)

| # | Logical State | Mobile Ref | Desktop Ref | Notes if Desktop Missing |
|---|---|---|---|---|
| 1 | Register — Details | Yes | Yes | — |
| 2 | Email Verification — OTP | Yes | Yes | — |
| 2a | Email OTP — Wrong Code | Yes | Yes | — |
| 2b | Email OTP — Expired | Yes | **No** | *Derived State.* Reused OTP-expired pattern. |
| 3 | Mobile Verification — OTP | Yes | Yes | — |
| 3a | Mobile OTP — Wrong Code | Yes | **No** | *Derived State.* Reused desktop error-state pattern from 2a. |
| 3b | Mobile OTP — Max Attempts | Yes | **No** | *Derived State.* Reused error-state pattern from 2a with updated text. |
| 4 | Set Up MFA (method selection) | Yes | **No** | *Derived State.* Built desktop version using shared components. |
| 5 | Authenticator Setup (QR) | Yes | Yes | — |
| 6 | MFA Verification | Yes | **No** | *Derived State.* Reused OTP-entry composition from states 2/3. |
| 6a | MFA Wrong Code | Yes | **No** | *Derived State.* Reused error-state pattern from 2a. |
| 7 | Registration Success | Yes | Yes | — |

**Derived State Tracking:** The 6 desktop registration states marked as **No** above lack external design references. In the codebase, these states must carry the `data-derived="true"` attribute on their root element. Their visual regression baselines are verified for component consistency, not pixel-accurate reference matching.

## Login (6 Logical States)

| # | Logical State | Mobile Ref | Desktop Ref |
|---|---|---|---|
| 1 | Login (default) | Yes | Yes |
| 2 | Invalid Credentials | Yes | Yes |
| 3 | Choose Method | Yes | Yes |
| 4 | Email OTP | Yes | Yes |
| 5 | Wrong OTP | Yes | Yes |
| 6 | OTP Expired (timer & resend)| Yes | Yes |

*Note: All Login states have full mobile and desktop coverage in the design references.*

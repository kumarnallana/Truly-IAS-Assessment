# UI Reference Matrix

This document maintains a permanent inventory of every authentication state and whether it is derived from an actual source reference or derived via the structural design system.

## Provenance Categories
- **REFERENCE_OBSERVED:** Directly measurable from a source reference image.
- **REFERENCE_MEASURED:** Exact geometry extracted from a 1:1 reference.
- **DERIVED_DESKTOP:** Structurally inferred from the established desktop system.
- **DERIVED_RESPONSIVE:** Structurally inferred from the established mobile/tablet system.
- **IMPLEMENTATION_VALIDATED:** Actual CSS/DOM value chosen to reproduce derived geometry, pending visual human approval.

## State Matrix

| Flow | State | Desktop Ref | Mobile Ref | Source Type (Desktop) | Source Type (Mobile) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Registration** | Step 1: Details | Yes | Yes | REFERENCE_OBSERVED | REFERENCE_OBSERVED |
| **Registration** | Step 2: Email OTP | Yes | Yes | REFERENCE_OBSERVED | REFERENCE_OBSERVED |
| **Registration** | Step 2a: Email Wrong | No | Yes | DERIVED_DESKTOP | REFERENCE_OBSERVED |
| **Registration** | Step 2b: Email Expired | No | Yes | DERIVED_DESKTOP | REFERENCE_OBSERVED |
| **Registration** | Step 3: Mobile OTP | Yes | Yes | REFERENCE_OBSERVED | REFERENCE_OBSERVED |
| **Registration** | Step 3a: Mobile Wrong | No | Yes | DERIVED_DESKTOP | REFERENCE_OBSERVED |
| **Registration** | Step 3b: Mobile Max | No | Yes | DERIVED_DESKTOP | REFERENCE_OBSERVED |
| **Registration** | Step 4: MFA Setup | No | Yes | DERIVED_DESKTOP | REFERENCE_OBSERVED |
| **Registration** | Step 5: Auth Setup QR | Yes | Yes | REFERENCE_OBSERVED | REFERENCE_OBSERVED |
| **Registration** | Step 6: MFA Verify | No | Yes | DERIVED_DESKTOP | REFERENCE_OBSERVED |
| **Registration** | Step 6a: MFA Wrong | No | Yes | DERIVED_DESKTOP | REFERENCE_OBSERVED |
| **Registration** | Step 7: Success | Yes | Yes | REFERENCE_OBSERVED | REFERENCE_OBSERVED |
| **Login** | Default | Yes | Yes | REFERENCE_OBSERVED | REFERENCE_OBSERVED |
| **Login** | Invalid | No | Yes | DERIVED_DESKTOP | REFERENCE_OBSERVED |
| **Login** | Method Choice | No | Yes | DERIVED_DESKTOP | REFERENCE_OBSERVED |
| **Login** | Email OTP | No | Yes | DERIVED_DESKTOP | REFERENCE_OBSERVED |
| **Login** | Wrong OTP | No | Yes | DERIVED_DESKTOP | REFERENCE_OBSERVED |
| **Login** | Expired OTP | No | Yes | DERIVED_DESKTOP | REFERENCE_OBSERVED |

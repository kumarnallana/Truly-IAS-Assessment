# SecureID Desktop Reference Audit

## STATUS: DERIVED APPROXIMATION
**Confidence:** Moderate.
**Reason:** The supplied reference screenshots (`web-registration-flow.png`, `web-login-flow.png`) are downscaled composite filmstrips (1024px width for 6 stitched frames, resulting in ~170px width per state). Due to compression and scaling, exact pixel-perfect geometry cannot be algorithmically extracted without artifacting. Measurements below are derived approximations selecting the closest standard desktop grid ratios based on visual boundaries in the source images.

## 1. Registration Flow (web-registration-flow.png)

### Viewport Assumption
- **Viewport:** 1440px wide.

### Authentication Card (Registration)
- **Bounding Box (Card):**
  - **Width:** 960px (derived as an optimal two-column form width).
  - **Height:** Auto-flowing based on content, min-height ~600px.
  - **Position:** Centered horizontally (`margin: 0 auto`), shifted ~10vh down from top.
  - **Radius:** 16px.
  - **Background:** Solid white (`#FFFFFF`).

### Structural Composition
- **Header Geometry:** 
  - Exists *inside* the card bounding box.
  - **Logo:** `x = 0` (relative to inner padding, flush left).
  - **Stepper:** `x = right-aligned` (flush right).
- **Two-Column Content Box:**
  - **Form Column (Left):** 55% of inner width (approx 528px).
  - **Password Rules Column (Right):** 40% of inner width (approx 384px) with 5% gap.
  - **Y-Alignment:** The Password Rules column originates vertically on the same y-axis as the Password input field.

## 2. Login Flow (web-login-flow.png)

### Viewport Assumption
- **Viewport:** 1440px wide.

### Authentication Card (Login)
- **Bounding Box (Card):**
  - **Width:** 880px (derived, slightly narrower than registration).
  - **Position:** Centered horizontally.
  - **Radius:** 16px.
  - **Layout:** Split-pane Flex/Grid.

### Structural Composition (Split Ratio)
- **Left Brand Panel (Blue):**
  - **Width:** 40% of card width (approx 352px).
  - **Visuals:** Solid blue gradient. Contains Shield Icon, "SecureID", access text.
- **Right Form Panel (White):**
  - **Width:** 60% of card width (approx 528px).
  - **Visuals:** Contains header, form, controls, login button.

## 3. Structural Violations in Current Implementation (actual-build-register-step1.png)
- **Violation 1:** Header logo is placed outside the card bounding box.
- **Violation 2:** Stepper is placed outside the card and utilizes a large 100% width geometry instead of the compact top-right geometry.
- **Violation 3:** Card is single-column, forcing the password requirements below the form instead of beside it.
- **Violation 4:** Unauthorized orange padlock icon exists in the password field.

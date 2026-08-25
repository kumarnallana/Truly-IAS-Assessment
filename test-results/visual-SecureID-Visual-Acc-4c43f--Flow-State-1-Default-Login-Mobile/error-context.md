# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual.spec.js >> SecureID Visual & Accessibility Baselines >> Login Flow >> State 1: Default Login
- Location: tests\visual.spec.js:115:5

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  -  1
+ Received  + 95

- Array []
+ Array [
+   Object {
+     "description": "Ensure buttons have discernible text",
+     "help": "Buttons must have discernible text",
+     "helpUrl": "https://dequeuniversity.com/rules/axe/4.13/button-name?application=playwright",
+     "id": "button-name",
+     "impact": "critical",
+     "nodes": Array [
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": null,
+             "id": "button-has-visible-text",
+             "impact": "critical",
+             "message": "Element does not have inner text that is visible to screen readers",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": null,
+             "id": "aria-label",
+             "impact": "critical",
+             "message": "aria-label attribute does not exist or is empty",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": null,
+             "id": "aria-labelledby",
+             "impact": "critical",
+             "message": "aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": Object {
+               "messageKey": "noAttr",
+             },
+             "id": "non-empty-title",
+             "impact": "critical",
+             "message": "Element has no title attribute",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": null,
+             "id": "implicit-label",
+             "impact": "critical",
+             "message": "Element does not have an implicit (wrapped) <label>",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": null,
+             "id": "explicit-label",
+             "impact": "critical",
+             "message": "Element does not have an explicit <label>",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": null,
+             "id": "presentational-role",
+             "impact": "critical",
+             "message": "Element's default semantics were not overridden with role=\"none\" or role=\"presentation\"",
+             "relatedNodes": Array [],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element does not have inner text that is visible to screen readers
+   aria-label attribute does not exist or is empty
+   aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty
+   Element has no title attribute
+   Element does not have an implicit (wrapped) <label>
+   Element does not have an explicit <label>
+   Element's default semantics were not overridden with role=\"none\" or role=\"presentation\"",
+         "html": "<button type=\"button\" class=\"mobile-keypad__btn\" data-key=\"blank\" disabled=\"\"></button>",
+         "impact": "critical",
+         "none": Array [],
+         "target": Array [
+           "button[data-key=\"blank\"]",
+         ],
+       },
+     ],
+     "tags": Array [
+       "cat.name-role-value",
+       "wcag2a",
+       "wcag412",
+       "section508",
+       "section508.22.a",
+       "TTv5",
+       "TT6.a",
+       "EN-301-549",
+       "EN-9.4.1.2",
+       "ACT",
+       "RGAAv4",
+       "RGAA-11.9.1",
+     ],
+   },
+ ]
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - generic [ref=e3]:
      - generic [ref=e4]: 🛡️
      - heading "SecureID" [level=2] [ref=e5]
      - paragraph [ref=e6]: Secure access to your enterprise applications
    - generic [ref=e7]:
      - generic [ref=e8]:
        - generic [ref=e9]: 🛡️
        - generic [ref=e10]: SecureID
      - region [ref=e11]:
        - generic [ref=e12]:
          - heading "Welcome back!" [level=1] [ref=e13]
          - paragraph [ref=e14]: Login to your account
        - generic [ref=e15]:
          - textbox "Email or Username" [ref=e17]
          - generic [ref=e19]:
            - textbox "••••••••••••" [ref=e20]
            - button "Toggle password visibility" [ref=e21] [cursor=pointer]: 👁
          - generic [ref=e22]:
            - generic [ref=e23] [cursor=pointer]:
              - checkbox "Remember me" [ref=e24]
              - generic [ref=e25]: Remember me
            - link "Forgot password?" [ref=e26] [cursor=pointer]:
              - /url: "#"
          - button "Login" [ref=e27] [cursor=pointer]
          - generic [ref=e28]: or
          - button "Continue with Google" [ref=e29] [cursor=pointer]
        - generic [ref=e30]:
          - text: New here?
          - link "Create an account" [ref=e31]:
            - /url: /index.html
  - generic [ref=e32]:
    - button "1" [ref=e33] [cursor=pointer]
    - button "2" [ref=e34] [cursor=pointer]
    - button "3" [ref=e35] [cursor=pointer]
    - button "4" [ref=e36] [cursor=pointer]
    - button "5" [ref=e37] [cursor=pointer]
    - button "6" [ref=e38] [cursor=pointer]
    - button "7" [ref=e39] [cursor=pointer]
    - button "8" [ref=e40] [cursor=pointer]
    - button "9" [ref=e41] [cursor=pointer]
    - button [disabled] [ref=e42] [cursor=pointer]
    - button "0" [ref=e43] [cursor=pointer]
    - button "Backspace" [ref=e44] [cursor=pointer]: ⌫
  - contentinfo [ref=e45]: © 2026 SecureID. All rights reserved.
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | import AxeBuilder from "@axe-core/playwright";
  3   | 
  4   | test.describe("SecureID Visual & Accessibility Baselines", () => {
  5   |   // A helper to freeze dynamic UI elements to ensure deterministic snapshots
  6   |   const freezeDynamicContent = async (page) => {
  7   |     await page.evaluate(() => {
  8   |       const timers = document.querySelectorAll('[data-testid$="-expiry-timer"]');
  9   |       timers.forEach(t => { t.textContent = "00:00"; });
  10  |       
  11  |       const qrCode = document.querySelector('[data-testid="qr-image-el"]');
  12  |       if (qrCode) qrCode.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"; // 1x1 transparent pixel
  13  |       
  14  |       const manualKey = document.querySelector('[data-testid="manual-secret-key"]');
  15  |       if (manualKey) manualKey.textContent = "FROZEN_KEY_FOR_SNAPSHOTS";
  16  |     });
  17  |   };
  18  | 
  19  |   const a11yCheck = async (page) => {
  20  |     const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
> 21  |     expect(accessibilityScanResults.violations).toEqual([]);
      |                                                 ^ Error: expect(received).toEqual(expected) // deep equality
  22  |   };
  23  | 
  24  |   test.describe("Registration Flow", () => {
  25  |     test.beforeEach(async ({ page }) => {
  26  |       await page.goto("/index.html");
  27  |     });
  28  | 
  29  |     test("State 1: Details", async ({ page }) => {
  30  |       await page.evaluate(() => window.showScreen("registration"));
  31  |       await freezeDynamicContent(page);
  32  |       await expect(page).toHaveScreenshot("registration-state-1-details.png");
  33  |       await a11yCheck(page);
  34  |     });
  35  | 
  36  |     test("State 2: Email OTP", async ({ page }) => {
  37  |       await page.evaluate(() => {
  38  |         window.showScreen("emailOtp");
  39  |         document.querySelector('[data-testid="email-otp-error"]').classList.add("hidden");
  40  |       });
  41  |       await freezeDynamicContent(page);
  42  |       await expect(page).toHaveScreenshot("registration-state-2-email-otp.png");
  43  |       await a11yCheck(page);
  44  |     });
  45  | 
  46  |     test("State 2a: Email OTP Error", async ({ page }) => {
  47  |       await page.evaluate(() => {
  48  |         window.showScreen("emailOtp");
  49  |         const err = document.querySelector('[data-testid="email-otp-error"]');
  50  |         err.classList.remove("hidden");
  51  |         err.textContent = "Incorrect code. Please try again.";
  52  |       });
  53  |       await freezeDynamicContent(page);
  54  |       await expect(page).toHaveScreenshot("registration-state-2a-email-error.png");
  55  |     });
  56  | 
  57  |     test("State 2b: Email OTP Expired", async ({ page }) => {
  58  |       await page.evaluate(() => {
  59  |         window.showScreen("emailOtp");
  60  |         const err = document.querySelector('[data-testid="email-otp-error"]');
  61  |         err.classList.remove("hidden");
  62  |         err.textContent = "This code has expired.";
  63  |       });
  64  |       await freezeDynamicContent(page);
  65  |       await expect(page).toHaveScreenshot("registration-state-2b-email-expired.png");
  66  |     });
  67  | 
  68  |     test("State 3: Mobile OTP", async ({ page }) => {
  69  |       await page.evaluate(() => {
  70  |         window.showScreen("smsOtp");
  71  |         document.querySelector('[data-testid="sms-otp-error"]').classList.add("hidden");
  72  |       });
  73  |       await freezeDynamicContent(page);
  74  |       await expect(page).toHaveScreenshot("registration-state-3-mobile-otp.png");
  75  |       await a11yCheck(page);
  76  |     });
  77  | 
  78  |     test("State 4: MFA Setup Choice", async ({ page }) => {
  79  |       await page.evaluate(() => window.showScreen("mfaChoice"));
  80  |       await freezeDynamicContent(page);
  81  |       await expect(page).toHaveScreenshot("registration-state-4-mfa-choice.png");
  82  |       await a11yCheck(page);
  83  |     });
  84  | 
  85  |     test("State 5: Authenticator Setup QR", async ({ page }) => {
  86  |       await page.evaluate(() => window.showScreen("authenticatorSetup"));
  87  |       await freezeDynamicContent(page);
  88  |       await expect(page).toHaveScreenshot("registration-state-5-mfa-qr.png");
  89  |       await a11yCheck(page);
  90  |     });
  91  | 
  92  |     test("State 6: MFA Verify", async ({ page }) => {
  93  |       await page.evaluate(() => {
  94  |         window.showScreen("mfaVerify");
  95  |         document.querySelector('[data-testid="mfa-error-banner"]').classList.add("hidden");
  96  |       });
  97  |       await freezeDynamicContent(page);
  98  |       await expect(page).toHaveScreenshot("registration-state-6-mfa-verify.png");
  99  |       await a11yCheck(page);
  100 |     });
  101 | 
  102 |     test("State 7: Registration Success", async ({ page }) => {
  103 |       await page.evaluate(() => window.showScreen("success"));
  104 |       await freezeDynamicContent(page);
  105 |       await expect(page).toHaveScreenshot("registration-state-7-success.png");
  106 |       await a11yCheck(page);
  107 |     });
  108 |   });
  109 | 
  110 |   test.describe("Login Flow", () => {
  111 |     test.beforeEach(async ({ page }) => {
  112 |       await page.goto("/login.html");
  113 |     });
  114 | 
  115 |     test("State 1: Default Login", async ({ page }) => {
  116 |       await page.evaluate(() => window.showScreen("login-screen"));
  117 |       await freezeDynamicContent(page);
  118 |       await expect(page).toHaveScreenshot("login-state-1-default.png");
  119 |       await a11yCheck(page);
  120 |     });
  121 | 
```
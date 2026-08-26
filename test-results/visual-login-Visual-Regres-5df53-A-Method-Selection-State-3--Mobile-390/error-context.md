# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual\login.spec.js >> Visual Regression - Login Flow >> MFA Method Selection (State 3)
- Location: tests\regression\visual\login.spec.js:28:3

# Error details

```
Error: expect(page).toHaveScreenshot(expected) failed

  38667 pixels (ratio 0.12 of all image pixels) are different.

  Snapshot: login-state-3-method.png

Call log:
  - Expect "toHaveScreenshot(login-state-3-method.png)" with timeout 5000ms
    - verifying given screenshot expectation
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - 38667 pixels (ratio 0.12 of all image pixels) are different.
  - waiting 100ms before taking screenshot
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - captured a stable screenshot
  - 38667 pixels (ratio 0.12 of all image pixels) are different.

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - generic [ref=e3]:
      - generic [ref=e4]:
        - generic [ref=e5]: 🛡️
        - generic [ref=e6]: SecureID
      - region [ref=e7]:
        - button "Go back" [ref=e8] [cursor=pointer]: ←
        - generic [ref=e9]:
          - heading "Verify your identity" [level=1] [ref=e10]
          - paragraph [ref=e11]: Choose a method to continue
        - generic [ref=e12]:
          - generic [ref=e13]:
            - generic [ref=e14] [cursor=pointer]:
              - radio "✉️ Email OTP Receive a code on your email" [checked] [ref=e15]
              - generic [ref=e16]: ✉️
              - generic [ref=e17]:
                - generic [ref=e18]: Email OTP
                - generic [ref=e19]: Receive a code on your email
            - generic [ref=e20] [cursor=pointer]:
              - radio "💬 SMS OTP Receive a code on your mobile" [ref=e21]
              - generic [ref=e22]: 💬
              - generic [ref=e23]:
                - generic [ref=e24]: SMS OTP
                - generic [ref=e25]: Receive a code on your mobile
            - generic [ref=e26] [cursor=pointer]:
              - radio "🔒 Authenticator App Use code from authenticator app" [ref=e27]
              - generic [ref=e28]: 🔒
              - generic [ref=e29]:
                - generic [ref=e30]: Authenticator App
                - generic [ref=e31]: Use code from authenticator app
          - button "Continue" [ref=e32] [cursor=pointer]
  - contentinfo [ref=e33]: © 2026 SecureID. All rights reserved.
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { setLoginState, setOtpState, freezeEnvironment } from '../../helpers/states.js';
  3  | 
  4  | test.describe('Visual Regression - Login Flow', () => {
  5  |   // Test matrix will run against the configured viewports automatically via Playwright projects
  6  | 
  7  |   test('Login Default (State 1)', async ({ page }) => {
  8  |     await setLoginState(page, 'login-screen');
  9  |     // Basic structural check before capturing visual
  10 |     let overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  11 |     expect(overflow).toBe(false);
  12 |     
  13 |     await expect(page).toHaveScreenshot('login-state-1-default.png');
  14 |   });
  15 | 
  16 |   test('Login Invalid Credentials (State 2)', async ({ page }) => {
  17 |     await setLoginState(page, 'login-screen');
  18 |     await page.evaluate(() => {
  19 |       document.querySelector('[data-testid="error-login"]').classList.remove('hidden');
  20 |       document.querySelector('[data-testid="login-email"]').classList.add('input--error');
  21 |       document.querySelector('[data-testid="login-email"]').value = 'invalid@email.com';
  22 |       document.querySelector('[data-testid="login-password"]').classList.add('input--error');
  23 |       document.querySelector('[data-testid="login-password"]').value = 'wrongpassword';
  24 |     });
  25 |     await expect(page).toHaveScreenshot('login-state-2-invalid.png');
  26 |   });
  27 | 
  28 |   test('MFA Method Selection (State 3)', async ({ page }) => {
  29 |     await setLoginState(page, 'login-mfa-choice-screen');
> 30 |     await expect(page).toHaveScreenshot('login-state-3-method.png');
     |                        ^ Error: expect(page).toHaveScreenshot(expected) failed
  31 |   });
  32 | 
  33 |   test('Email OTP (State 4)', async ({ page }) => {
  34 |     await setLoginState(page, 'login-otp-screen');
  35 |     await setOtpState(page, 'valid');
  36 |     await expect(page).toHaveScreenshot('login-state-4-otp.png');
  37 |   });
  38 | 
  39 |   test('Email OTP Wrong (State 5)', async ({ page }) => {
  40 |     await setLoginState(page, 'login-otp-screen');
  41 |     await setOtpState(page, 'wrong');
  42 |     await expect(page).toHaveScreenshot('login-state-5-otp-wrong.png');
  43 |   });
  44 | 
  45 |   test('Email OTP Expired (State 6)', async ({ page }) => {
  46 |     await setLoginState(page, 'login-otp-screen');
  47 |     await setOtpState(page, 'expired');
  48 |     await expect(page).toHaveScreenshot('login-state-6-otp-expired.png');
  49 |   });
  50 | });
  51 | 
```
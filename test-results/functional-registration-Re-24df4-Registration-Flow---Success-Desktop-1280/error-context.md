# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: functional\registration.spec.js >> Registration UI Corrections & Smoke Test >> Registration Flow - Success
- Location: tests\regression\functional\registration.spec.js:4:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Verify Email' })

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - generic [ref=e3]:
      - generic [ref=e4]:
        - generic [ref=e5]: 🛡️
        - generic [ref=e6]: SecureID
      - navigation "Registration Progress" [ref=e7]:
        - generic [ref=e8]: ✓
        - generic [ref=e10]: ✓
        - generic [ref=e12]: "3"
        - generic [ref=e14]: "4"
        - generic [ref=e16]: "5"
    - region [ref=e17]:
      - generic [ref=e18]:
        - generic [ref=e19]:
          - generic [ref=e20]: 📞
          - heading "Verify your mobile" [level=1] [ref=e21]
          - paragraph [ref=e22]:
            - text: We have sent a 6-digit code to
            - strong [ref=e23]: "9876543210"
        - group "6-digit mobile OTP" [ref=e24]:
          - textbox "Digit 1" [ref=e25]
          - textbox "Digit 2" [ref=e26]
          - textbox "Digit 3" [ref=e27]
          - textbox "Digit 4" [ref=e28]
          - textbox "Digit 5" [ref=e29]
          - textbox "Digit 6" [ref=e30]
        - generic [ref=e31]:
          - paragraph [ref=e32]:
            - text: Code expires in
            - strong [ref=e33]: 04:33
          - button "Verify Mobile" [ref=e34] [cursor=pointer]
          - paragraph [ref=e35]:
            - text: Wrong number?
            - button "Change" [ref=e36] [cursor=pointer]
  - contentinfo [ref=e37]: © 2026 SecureID. All rights reserved.
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Registration UI Corrections & Smoke Test', () => {
  4   |   test('Registration Flow - Success', async ({ page }) => {
  5   |     // Mock API requests
  6   |     await page.route('**/api/register', async route => {
  7   |       await route.fulfill({ body: JSON.stringify({ userId: '123', challengeId: 'challenge-123' }), contentType: 'application/json' });
  8   |     });
  9   |     await page.route('**/api/verify-email-otp', async route => {
  10  |       await route.fulfill({ body: JSON.stringify({ success: true }), contentType: 'application/json' });
  11  |     });
  12  |     await page.route('**/api/send-sms-otp', async route => {
  13  |       await route.fulfill({ body: JSON.stringify({ challengeId: 'sms-challenge-123' }), contentType: 'application/json' });
  14  |     });
  15  |     await page.route('**/api/verify-sms-otp', async route => {
  16  |       await route.fulfill({ body: JSON.stringify({ success: true }), contentType: 'application/json' });
  17  |     });
  18  |     await page.route('**/api/mfa/setup', async route => {
  19  |       await route.fulfill({ body: JSON.stringify({ qrCodeDataUrl: 'data:image/png;base64,...', base32Secret: 'SECRET123', challengeId: 'mfa-challenge' }), contentType: 'application/json' });
  20  |     });
  21  |     await page.route('**/api/verify-mfa-setup', async route => {
  22  |       await route.fulfill({ body: JSON.stringify({ registrationComplete: true }), contentType: 'application/json' });
  23  |     });
  24  | 
  25  |     page.on('request', req => console.log('>>', req.method(), req.url()));
  26  |     page.on('response', res => console.log('<<', res.status(), res.url()));
  27  | 
  28  |     await page.goto('/index.html');
  29  | 
  30  |     // 1. Verify correct fields are present
  31  |     await expect(page.getByTestId('reg-fullname')).toBeVisible();
  32  |     await expect(page.getByTestId('reg-email')).toBeVisible();
  33  |     await expect(page.getByTestId('reg-mobile')).toBeVisible();
  34  |     await expect(page.getByTestId('reg-password')).toBeVisible();
  35  |     await expect(page.getByTestId('reg-confirm-password')).not.toBeVisible();
  36  | 
  37  |     // 2. Fill the form
  38  |     await page.getByTestId('reg-fullname').fill('Priya Sharma');
  39  |     await page.getByTestId('reg-email').fill('priya.sharma@email.com');
  40  |     await page.getByTestId('reg-mobile').fill('9876543210');
  41  |     await page.getByTestId('reg-password').fill('Password@123');
  42  |     await page.getByTestId('reg-terms').check();
  43  | 
  44  |     // 3. Submit
  45  |     await page.getByRole('button', { name: 'Create Account' }).click();
  46  | 
  47  |     await page.waitForTimeout(1000);
  48  |     const pageErrors = await page.evaluate(() => {
  49  |       return Array.from(document.querySelectorAll('.form-field__error-text, .alert-banner--error'))
  50  |         .filter(e => e.style.display !== 'none' && !e.classList.contains('hidden'))
  51  |         .map(e => e.id || e.getAttribute('data-testid') + ': ' + e.textContent);
  52  |     });
  53  |     console.log("VISIBLE ERRORS:", pageErrors);
  54  |     
  55  |     const activeScreen = await page.evaluate(() => document.querySelector('.screen[data-active="true"]')?.getAttribute('data-testid'));
  56  |     console.log("ACTIVE SCREEN:", activeScreen);
  57  | 
  58  |     // 4. Expect transition to Email OTP
  59  |     await expect(page.getByRole('heading', { name: 'Verify your email' })).toBeVisible();
  60  |     await expect(page.getByText('priya.sharma@email.com')).toBeVisible();
  61  | 
  62  |     const emailInputs = page.locator('[data-testid="email-otp-group"] input');
  63  |     for (let i = 0; i < 6; i++) {
  64  |       await emailInputs.nth(i).fill('1');
  65  |     }
  66  |     const otpValue = await page.evaluate(() => {
  67  |       return Array.from(document.querySelectorAll('[data-testid="email-otp-group"] input')).map(i => i.value).join("");
  68  |     });
  69  |     console.log("OTP VALUE IN DOM:", otpValue);
  70  |     
  71  |     // ensure click happens
> 72  |     await page.getByRole('button', { name: 'Verify Email' }).click({ force: true });
      |                                                              ^ Error: locator.click: Test timeout of 30000ms exceeded.
  73  | 
  74  |     await page.waitForTimeout(1000);
  75  |     const emailOtpError = await page.evaluate(() => document.querySelector('[data-testid="email-otp-error"]')?.textContent);
  76  |     console.log("EMAIL OTP ERROR:", emailOtpError);
  77  |     const activeScreenAfterEmail = await page.evaluate(() => document.querySelector('.screen[data-active="true"]')?.getAttribute('data-testid'));
  78  |     console.log("ACTIVE SCREEN AFTER EMAIL:", activeScreenAfterEmail);
  79  | 
  80  |     // 5. Expect transition to Mobile OTP
  81  |     await expect(page.getByRole('heading', { name: 'Verify your mobile' })).toBeVisible();
  82  |     await expect(page.getByText('98765 43210')).toBeVisible();
  83  | 
  84  |     const mobileInputs = page.locator('[data-testid="sms-otp-group"] input');
  85  |     for (let i = 0; i < 6; i++) {
  86  |       await mobileInputs.nth(i).fill('1');
  87  |     }
  88  | 
  89  |     // 6. Expect transition to MFA Choice
  90  |     await expect(page.getByRole('heading', { name: 'Set up Multi-Factor Auth' })).toBeVisible();
  91  |     await page.getByRole('button', { name: 'Continue' }).click();
  92  | 
  93  |     // 7. Expect transition to Auth Setup
  94  |     await expect(page.getByRole('heading', { name: 'Scan QR Code' })).toBeVisible();
  95  |     await page.getByRole('button', { name: 'Continue' }).click();
  96  | 
  97  |     // 8. Expect transition to MFA Verify
  98  |     await expect(page.getByRole('heading', { name: 'Enter the 6-digit code' })).toBeVisible();
  99  |     const mfaInputs = page.locator('[data-testid="mfa-otp-group"] input');
  100 |     for (let i = 0; i < 6; i++) {
  101 |       await mfaInputs.nth(i).fill('3');
  102 |     }
  103 |     await page.getByRole('button', { name: 'Verify & Complete' }).click();
  104 | 
  105 |     // 9. Success Screen
  106 |     await expect(page.getByRole('heading', { name: 'Account created!' })).toBeVisible();
  107 |   });
  108 | 
  109 |   test('Registration Validation - Empty and Invalid', async ({ page }) => {
  110 |     await page.goto('/index.html');
  111 | 
  112 |     // Submit empty
  113 |     await page.getByRole('button', { name: 'Create Account' }).click();
  114 | 
  115 |     // Expect client-side errors
  116 |     await expect(page.getByTestId('error-fullname')).toBeVisible();
  117 |     
  118 |     // Fill invalid email
  119 |     await page.getByTestId('reg-fullname').fill('Priya Sharma');
  120 |     await page.getByTestId('reg-email').fill('invalid-email');
  121 |     await page.getByRole('button', { name: 'Create Account' }).click();
  122 |     await expect(page.getByTestId('error-email')).toBeVisible();
  123 |     
  124 |     // Fill short password
  125 |     await page.getByTestId('reg-email').fill('priya.sharma@email.com');
  126 |     await page.getByTestId('reg-mobile').fill('9876543210');
  127 |     await page.getByTestId('reg-password').fill('short');
  128 |     await page.getByTestId('reg-terms').check();
  129 |     await page.getByRole('button', { name: 'Create Account' }).click();
  130 |     await expect(page.getByTestId('error-password')).toBeVisible();
  131 |   });
  132 | });
  133 | 
```
# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: functional\login.spec.js >> Part 2 login integration >> credentials transition into backend-provided MFA choices
- Location: tests\regression\functional\login.spec.js:17:3

# Error details

```
Error: expect(locator).toBeHidden() failed

Locator:  getByTestId('login-method-authenticator')
Expected: hidden
Received: visible
Timeout:  5000ms

Call log:
  - Expect "toBeHidden" with timeout 5000ms
  - waiting for getByTestId('login-method-authenticator')
    14 × locator resolved to <input disabled type="radio" value="AUTHENTICATOR" name="login-mfa-method" data-testid="login-method-authenticator"/>
       - unexpected value "visible"

```

```yaml
- radio "🔒 Authenticator App Use code from authenticator app" [disabled]
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | async function mockBaseAuth(page) {
  4   |   await page.route('**/api/csrf', (route) => route.fulfill({
  5   |     status: 200,
  6   |     contentType: 'application/json',
  7   |     body: JSON.stringify({ csrfToken: 'test-csrf-token' }),
  8   |   }));
  9   |   await page.route('**/api/me', (route) => route.fulfill({
  10  |     status: 401,
  11  |     contentType: 'application/json',
  12  |     body: JSON.stringify({ code: 'SESSION_REQUIRED', message: 'Authentication is required.' }),
  13  |   }));
  14  | }
  15  | 
  16  | test.describe('Part 2 login integration', () => {
  17  |   test('credentials transition into backend-provided MFA choices', async ({ page }) => {
  18  |     await mockBaseAuth(page);
  19  |     let loginPayload;
  20  |     await page.route('**/api/login', async (route) => {
  21  |       loginPayload = route.request().postDataJSON();
  22  |       await route.fulfill({
  23  |         status: 200,
  24  |         contentType: 'application/json',
  25  |         body: JSON.stringify({
  26  |           mfaRequired: true,
  27  |           loginToken: 'a'.repeat(43),
  28  |           methods: [
  29  |             { method: 'EMAIL', target: 'pr***@example.com' },
  30  |             { method: 'SMS', target: '*******3210' },
  31  |           ],
  32  |         }),
  33  |       });
  34  |     });
  35  | 
  36  |     await page.goto('/login.html');
  37  |     await page.getByTestId('login-email').fill('priya@example.com');
  38  |     await page.getByTestId('login-password').fill('CorrectPassword!1');
  39  |     await page.getByTestId('login-remember').check();
  40  |     await page.getByTestId('login-submit-btn').click();
  41  | 
  42  |     await expect(page.getByTestId('login-mfa-choice-screen')).toBeVisible();
  43  |     await expect(page.getByTestId('login-email-target')).toContainText('pr***@example.com');
> 44  |     await expect(page.getByTestId('login-method-authenticator')).toBeHidden();
      |                                                                  ^ Error: expect(locator).toBeHidden() failed
  45  |     expect(loginPayload).toEqual({ identifier: 'priya@example.com', password: 'CorrectPassword!1', rememberMe: true });
  46  |     await expect(page.getByTestId('login-password')).toHaveValue('');
  47  |   });
  48  | 
  49  |   test('MFA challenge and invalid OTP states are driven by API responses', async ({ page }) => {
  50  |     await mockBaseAuth(page);
  51  |     await page.route('**/api/login', (route) => route.fulfill({
  52  |       status: 200,
  53  |       contentType: 'application/json',
  54  |       body: JSON.stringify({
  55  |         mfaRequired: true,
  56  |         loginToken: 'b'.repeat(43),
  57  |         methods: [{ method: 'EMAIL', target: 'pr***@example.com' }],
  58  |       }),
  59  |     }));
  60  |     await page.route('**/api/login/challenge', (route) => route.fulfill({
  61  |       status: 201,
  62  |       contentType: 'application/json',
  63  |       body: JSON.stringify({
  64  |         method: 'EMAIL',
  65  |         challengeId: 'challenge-login-1',
  66  |         target: 'pr***@example.com',
  67  |         expiresAt: new Date(Date.now() + 300_000).toISOString(),
  68  |       }),
  69  |     }));
  70  |     await page.route('**/api/verify-login-otp', (route) => route.fulfill({
  71  |       status: 400,
  72  |       contentType: 'application/json',
  73  |       body: JSON.stringify({ code: 'INVALID_OTP', message: 'Incorrect code. Please try again.', details: { attemptsRemaining: 2 } }),
  74  |     }));
  75  | 
  76  |     await page.goto('/login.html');
  77  |     await page.getByTestId('login-email').fill('priya@example.com');
  78  |     await page.getByTestId('login-password').fill('CorrectPassword!1');
  79  |     await page.getByTestId('login-submit-btn').click();
  80  |     await page.getByTestId('login-mfa-choice-continue-btn').click();
  81  |     await expect(page.getByTestId('login-otp-screen')).toBeVisible();
  82  | 
  83  |     const boxes = page.getByTestId('login-otp-group').locator('input');
  84  |     for (const [index, digit] of [...'123456'].entries()) await boxes.nth(index).fill(digit);
  85  | 
  86  |     await expect(page.getByTestId('login-otp-error')).toBeVisible();
  87  |     await expect(page.getByTestId('login-otp-error')).toContainText('2 attempts left');
  88  |   });
  89  | 
  90  |   test('successful MFA creates a session-backed dashboard without browser token storage', async ({ page }) => {
  91  |     await mockBaseAuth(page);
  92  |     let authenticated = false;
  93  |     await page.unroute('**/api/me');
  94  |     await page.route('**/api/me', (route) => route.fulfill({
  95  |       status: authenticated ? 200 : 401,
  96  |       contentType: 'application/json',
  97  |       body: JSON.stringify(authenticated
  98  |         ? { authenticated: true, user: { name: 'Priya Sharma', email: 'priya@example.com', mfaEnabled: true } }
  99  |         : { code: 'SESSION_REQUIRED', message: 'Authentication is required.' }),
  100 |     }));
  101 |     await page.route('**/api/login', (route) => route.fulfill({
  102 |       status: 200,
  103 |       contentType: 'application/json',
  104 |       body: JSON.stringify({ mfaRequired: true, loginToken: 'c'.repeat(43), methods: [{ method: 'EMAIL', target: 'pr***@example.com' }] }),
  105 |     }));
  106 |     await page.route('**/api/login/challenge', (route) => route.fulfill({
  107 |       status: 201,
  108 |       contentType: 'application/json',
  109 |       body: JSON.stringify({ method: 'EMAIL', challengeId: 'challenge-login-2', target: 'pr***@example.com', expiresAt: new Date(Date.now() + 300_000).toISOString() }),
  110 |     }));
  111 |     await page.route('**/api/verify-login-otp', (route) => {
  112 |       authenticated = true;
  113 |       return route.fulfill({
  114 |         status: 200,
  115 |         contentType: 'application/json',
  116 |         body: JSON.stringify({ authenticated: true, redirectTo: '/dashboard.html' }),
  117 |       });
  118 |     });
  119 | 
  120 |     await page.goto('/login.html');
  121 |     await page.getByTestId('login-email').fill('priya@example.com');
  122 |     await page.getByTestId('login-password').fill('CorrectPassword!1');
  123 |     await page.getByTestId('login-submit-btn').click();
  124 |     await page.getByTestId('login-mfa-choice-continue-btn').click();
  125 |     const boxes = page.getByTestId('login-otp-group').locator('input');
  126 |     for (const [index, digit] of [...'654321'].entries()) await boxes.nth(index).fill(digit);
  127 | 
  128 |     await expect(page).toHaveURL(/dashboard\.html/);
  129 |     await expect(page.getByTestId('dashboard-name')).toHaveText('Priya Sharma');
  130 |     const storage = await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } }));
  131 |     expect(JSON.stringify(storage)).not.toMatch(/token|jwt/i);
  132 |   });
  133 | });
  134 | 
```
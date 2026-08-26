import { test, expect } from '@playwright/test';

async function mockBaseAuth(page) {
  await page.route('**/api/csrf', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ csrfToken: 'test-csrf-token' }),
  }));
  await page.route('**/api/me', (route) => route.fulfill({
    status: 401,
    contentType: 'application/json',
    body: JSON.stringify({ code: 'SESSION_REQUIRED', message: 'Authentication is required.' }),
  }));
}

test.describe('Part 2 login integration', () => {
  test('credentials transition into backend-provided MFA choices', async ({ page }) => {
    await mockBaseAuth(page);
    let loginPayload;
    await page.route('**/api/login', async (route) => {
      loginPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          mfaRequired: true,
          loginToken: 'a'.repeat(43),
          methods: [
            { method: 'EMAIL', target: 'pr***@example.com' },
            { method: 'SMS', target: '*******3210' },
          ],
        }),
      });
    });

    await page.goto('/login.html');
    await page.getByTestId('login-email').fill('priya@example.com');
    await page.getByTestId('login-password').fill('CorrectPassword!1');
    await page.getByTestId('login-remember').check();
    await page.getByTestId('login-submit-btn').click();

    await expect(page.getByTestId('login-mfa-choice-screen')).toBeVisible();
    await expect(page.getByTestId('login-email-target')).toContainText('pr***@example.com');
    await expect(page.getByTestId('login-method-authenticator')).toBeHidden();
    expect(loginPayload).toEqual({ identifier: 'priya@example.com', password: 'CorrectPassword!1', rememberMe: true });
    await expect(page.getByTestId('login-password')).toHaveValue('');
  });

  test('MFA challenge and invalid OTP states are driven by API responses', async ({ page }) => {
    await mockBaseAuth(page);
    await page.route('**/api/login', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        mfaRequired: true,
        loginToken: 'b'.repeat(43),
        methods: [{ method: 'EMAIL', target: 'pr***@example.com' }],
      }),
    }));
    await page.route('**/api/login/challenge', (route) => route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        method: 'EMAIL',
        challengeId: 'challenge-login-1',
        target: 'pr***@example.com',
        expiresAt: new Date(Date.now() + 300_000).toISOString(),
      }),
    }));
    await page.route('**/api/verify-login-otp', (route) => route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ code: 'INVALID_OTP', message: 'Incorrect code. Please try again.', details: { attemptsRemaining: 2 } }),
    }));

    await page.goto('/login.html');
    await page.getByTestId('login-email').fill('priya@example.com');
    await page.getByTestId('login-password').fill('CorrectPassword!1');
    await page.getByTestId('login-submit-btn').click();
    await page.getByTestId('login-mfa-choice-continue-btn').click();
    await expect(page.getByTestId('login-otp-screen')).toBeVisible();

    const boxes = page.getByTestId('login-otp-group').locator('input');
    for (const [index, digit] of [...'123456'].entries()) await boxes.nth(index).fill(digit);

    await expect(page.getByTestId('login-otp-error')).toBeVisible();
    await expect(page.getByTestId('login-otp-error')).toContainText('2 attempts left');
  });

  test('successful MFA creates a session-backed dashboard without browser token storage', async ({ page }) => {
    await mockBaseAuth(page);
    let authenticated = false;
    await page.unroute('**/api/me');
    await page.route('**/api/me', (route) => route.fulfill({
      status: authenticated ? 200 : 401,
      contentType: 'application/json',
      body: JSON.stringify(authenticated
        ? { authenticated: true, user: { name: 'Priya Sharma', email: 'priya@example.com', mfaEnabled: true } }
        : { code: 'SESSION_REQUIRED', message: 'Authentication is required.' }),
    }));
    await page.route('**/api/login', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ mfaRequired: true, loginToken: 'c'.repeat(43), methods: [{ method: 'EMAIL', target: 'pr***@example.com' }] }),
    }));
    await page.route('**/api/login/challenge', (route) => route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ method: 'EMAIL', challengeId: 'challenge-login-2', target: 'pr***@example.com', expiresAt: new Date(Date.now() + 300_000).toISOString() }),
    }));
    await page.route('**/api/verify-login-otp', (route) => {
      authenticated = true;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ authenticated: true, redirectTo: '/dashboard.html' }),
      });
    });

    await page.goto('/login.html');
    await page.getByTestId('login-email').fill('priya@example.com');
    await page.getByTestId('login-password').fill('CorrectPassword!1');
    await page.getByTestId('login-submit-btn').click();
    await page.getByTestId('login-mfa-choice-continue-btn').click();
    const boxes = page.getByTestId('login-otp-group').locator('input');
    for (const [index, digit] of [...'654321'].entries()) await boxes.nth(index).fill(digit);

    await expect(page).toHaveURL(/dashboard\.html/);
    await expect(page.getByTestId('dashboard-name')).toHaveText('Priya Sharma');
    const storage = await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } }));
    expect(JSON.stringify(storage)).not.toMatch(/token|jwt/i);
  });
});

import { test, expect } from '@playwright/test';

test.describe('Registration UI Corrections & Smoke Test', () => {
  test('Registration Flow - Success', async ({ page }) => {
    // Mock API requests
    await page.route('**/api/register', async route => {
      await route.fulfill({ body: JSON.stringify({ userId: '123', challengeId: 'challenge-123' }), contentType: 'application/json' });
    });
    await page.route('**/api/verify-email-otp', async route => {
      await route.fulfill({ body: JSON.stringify({ success: true }), contentType: 'application/json' });
    });
    await page.route('**/api/send-sms-otp', async route => {
      await route.fulfill({ body: JSON.stringify({ challengeId: 'sms-challenge-123' }), contentType: 'application/json' });
    });
    await page.route('**/api/verify-sms-otp', async route => {
      await route.fulfill({ body: JSON.stringify({ success: true }), contentType: 'application/json' });
    });
    await page.route('**/api/mfa/select-method', async route => {
      await route.fulfill({ body: JSON.stringify({ qrCodeDataUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', base32Secret: 'SECRET123', challengeId: 'mfa-challenge' }), contentType: 'application/json' });
    });
    await page.route('**/api/mfa/verify', async route => {
      await route.fulfill({ body: JSON.stringify({ registrationComplete: true }), contentType: 'application/json' });
    });

    await page.goto('/index.html');

    // 1. Verify correct fields are present
    await expect(page.getByTestId('reg-fullname')).toBeVisible();
    await expect(page.getByTestId('reg-email')).toBeVisible();
    await expect(page.getByTestId('reg-mobile')).toBeVisible();
    await expect(page.getByTestId('reg-password')).toBeVisible();
    await expect(page.getByTestId('reg-confirm-password')).not.toBeVisible();

    // 2. Fill the form
    await page.getByTestId('reg-fullname').fill('Priya Sharma');
    await page.getByTestId('reg-email').fill('priya.sharma@email.com');
    await page.getByTestId('reg-mobile').fill('9876543210');
    await page.getByTestId('reg-password').fill('Password@123');
    await page.getByTestId('reg-terms').check();

    // 3. Submit
    await page.getByRole('button', { name: 'Create Account' }).click();

    // 4. Expect transition to Email OTP
    await expect(page.getByRole('heading', { name: 'Verify your email' })).toBeVisible();
    await expect(page.getByText('priya.sharma@email.com')).toBeVisible();

    const emailInputs = page.locator('[data-testid="email-otp-group"] input');
    for (let i = 0; i < 6; i++) {
      await emailInputs.nth(i).fill('1');
    }
    // Auto-submit triggers API and transitions

    // 5. Expect transition to Mobile OTP
    await expect(page.getByRole('heading', { name: 'Verify your mobile' })).toBeVisible();
    await expect(page.getByText('98765 43210')).toBeVisible();

    const mobileInputs = page.locator('[data-testid="sms-otp-group"] input');
    for (let i = 0; i < 6; i++) {
      await mobileInputs.nth(i).fill('1');
    }
    // Auto-submit triggers API and transitions

    // 6. Expect transition to MFA Choice
    await expect(page.getByRole('heading', { name: 'Set up Multi-Factor Auth' })).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();

    // 7. Expect transition to Auth Setup
    await expect(page.getByRole('heading', { name: 'Scan QR Code' })).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();

    // 8. Expect transition to MFA Verify
    await expect(page.getByRole('heading', { name: 'Enter the 6-digit code' })).toBeVisible();
    const mfaInputs = page.locator('[data-testid="mfa-otp-group"] input');
    for (let i = 0; i < 6; i++) {
      await mfaInputs.nth(i).fill('3');
    }
    // Completing the sixth digit auto-submits the verification.
    // 9. Success Screen
    await expect(page.getByRole('heading', { name: 'Account created!' })).toBeVisible();
  });

  test('Registration Validation - Empty and Invalid', async ({ page }) => {
    await page.goto('/index.html');

    // Submit empty
    await page.getByRole('button', { name: 'Create Account' }).click();

    // Expect client-side errors
    await expect(page.getByTestId('error-fullname')).toBeVisible();
    
    // Fill invalid email
    await page.getByTestId('reg-fullname').fill('Priya Sharma');
    await page.getByTestId('reg-email').fill('invalid-email');
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page.getByTestId('error-email')).toBeVisible();
    
    // Fill short password
    await page.getByTestId('reg-email').fill('priya.sharma@email.com');
    await page.getByTestId('reg-mobile').fill('9876543210');
    await page.getByTestId('reg-password').fill('short');
    await page.getByTestId('reg-terms').check();
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page.getByTestId('error-password')).toBeVisible();
  });

  test('Active duplicate email gives an actionable inline sign-in error', async ({ page }) => {
    await page.route('**/api/register', async route => {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'ACCOUNT_EXISTS',
          message: 'An account with this email already exists. Sign in instead.',
          details: { email: 'This email is already registered. Sign in instead.' },
        }),
      });
    });

    await page.goto('/index.html');
    await page.getByTestId('reg-fullname').fill('Existing User');
    await page.getByTestId('reg-email').fill('existing@example.com');
    await page.getByTestId('reg-mobile').fill('9876543210');
    await page.getByTestId('reg-password').fill('Password@123');
    await page.getByTestId('reg-terms').check();
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page.getByTestId('error-email')).toContainText('already registered');
    await expect(page.getByTestId('error-form')).toContainText('Use Login');
    await expect(page.getByTestId('reg-email')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
  });

  test('Mobile password requirements stay beside the password before the terms and submit actions', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/index.html');
    await page.getByTestId('reg-password').fill('Password@123');

    const passwordBox = await page.getByTestId('reg-password').boundingBox();
    const rulesBox = await page.getByTestId('password-rules').boundingBox();
    const termsBox = await page.getByTestId('reg-terms').boundingBox();

    expect(passwordBox).not.toBeNull();
    expect(rulesBox).not.toBeNull();
    expect(termsBox).not.toBeNull();
    expect(rulesBox.y).toBeGreaterThan(passwordBox.y);
    expect(rulesBox.y).toBeLessThan(termsBox.y);
    await expect(page.getByTestId('password-rules')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(page.getByTestId('rule-length')).toHaveClass(/password-rules__item--valid/);
    await expect(page.getByTestId('rule-uppercase')).toHaveClass(/password-rules__item--valid/);
    await expect(page.getByTestId('rule-number')).toHaveClass(/password-rules__item--valid/);
    await expect(page.getByTestId('rule-special')).toHaveClass(/password-rules__item--valid/);
  });

  test('Desktop requirements panel spans the identity fields while actions remain in the left column', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/index.html');

    const layout = await page.evaluate(() => {
      const rect = (element) => {
        const box = element.getBoundingClientRect();
        return { top: box.top, bottom: box.bottom, left: box.left, right: box.right, width: box.width, height: box.height };
      };
      const nameField = document.querySelector('[data-testid="reg-fullname"]').closest('.form-field');
      const mobileField = document.querySelector('[data-testid="reg-mobile"]').closest('.form-field');
      const passwordField = document.querySelector('[data-testid="reg-password"]').closest('.form-field');
      const rules = document.querySelector('[data-testid="password-rules"]');
      const terms = document.querySelector('.registration-form__terms');
      const submit = document.querySelector('[data-testid="reg-submit-btn"]');
      return {
        name: rect(nameField),
        mobile: rect(mobileField),
        password: rect(passwordField),
        rules: rect(rules),
        terms: rect(terms),
        submit: rect(submit),
        rulesBackground: getComputedStyle(rules).backgroundColor,
      };
    });

    expect(Math.abs(layout.rules.top - layout.name.top)).toBeLessThan(2);
    // The mobile field's 20px bottom margin is deliberate spacing; the panel
    // itself ends with the identity-field block before the password row.
    expect(Math.abs(layout.rules.bottom - layout.mobile.bottom)).toBeLessThanOrEqual(20);
    expect(Math.abs(layout.terms.left - layout.password.left)).toBeLessThan(2);
    expect(layout.terms.top).toBeGreaterThanOrEqual(layout.password.bottom - 20);
    expect(Math.abs(layout.submit.width - layout.password.width)).toBeLessThan(2);
    expect(layout.rulesBackground).not.toBe('rgba(0, 0, 0, 0)');
  });
});

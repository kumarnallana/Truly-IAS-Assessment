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
    await page.route('**/api/mfa/setup', async route => {
      await route.fulfill({ body: JSON.stringify({ qrCodeDataUrl: 'data:image/png;base64,...', base32Secret: 'SECRET123', challengeId: 'mfa-challenge' }), contentType: 'application/json' });
    });
    await page.route('**/api/verify-mfa-setup', async route => {
      await route.fulfill({ body: JSON.stringify({ registrationComplete: true }), contentType: 'application/json' });
    });

    page.on('request', req => console.log('>>', req.method(), req.url()));
    page.on('response', res => console.log('<<', res.status(), res.url()));

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

    await page.waitForTimeout(1000);
    const pageErrors = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.form-field__error-text, .alert-banner--error'))
        .filter(e => e.style.display !== 'none' && !e.classList.contains('hidden'))
        .map(e => e.id || e.getAttribute('data-testid') + ': ' + e.textContent);
    });
    console.log("VISIBLE ERRORS:", pageErrors);
    
    const activeScreen = await page.evaluate(() => document.querySelector('.screen[data-active="true"]')?.getAttribute('data-testid'));
    console.log("ACTIVE SCREEN:", activeScreen);

    // 4. Expect transition to Email OTP
    await expect(page.getByRole('heading', { name: 'Verify your email' })).toBeVisible();
    await expect(page.getByText('priya.sharma@email.com')).toBeVisible();

    const emailInputs = page.locator('[data-testid="email-otp-group"] input');
    for (let i = 0; i < 6; i++) {
      await emailInputs.nth(i).fill('1');
    }
    const otpValue = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('[data-testid="email-otp-group"] input')).map(i => i.value).join("");
    });
    console.log("OTP VALUE IN DOM:", otpValue);
    
    // ensure click happens
    await page.getByRole('button', { name: 'Verify Email' }).click({ force: true });

    await page.waitForTimeout(1000);
    const emailOtpError = await page.evaluate(() => document.querySelector('[data-testid="email-otp-error"]')?.textContent);
    console.log("EMAIL OTP ERROR:", emailOtpError);
    const activeScreenAfterEmail = await page.evaluate(() => document.querySelector('.screen[data-active="true"]')?.getAttribute('data-testid'));
    console.log("ACTIVE SCREEN AFTER EMAIL:", activeScreenAfterEmail);

    // 5. Expect transition to Mobile OTP
    await expect(page.getByRole('heading', { name: 'Verify your mobile' })).toBeVisible();
    await expect(page.getByText('98765 43210')).toBeVisible();

    const mobileInputs = page.locator('[data-testid="sms-otp-group"] input');
    for (let i = 0; i < 6; i++) {
      await mobileInputs.nth(i).fill('1');
    }

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
    await page.getByRole('button', { name: 'Verify & Complete' }).click();

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
});

import { test, expect } from '@playwright/test';
import { setLoginState } from '../../helpers/states.js';

test.describe('Functional Regression', () => {

  test('Mobile Back Button navigation works correctly', async ({ page }) => {
    // Only test on Mobile viewport where Back button is visible
    if (page.viewportSize().width > 767) {
      test.skip();
    }
    
    await setLoginState(page, 'login-mfa-choice-screen');
    
    const backBtn = page.getByTestId('login-method-back-btn');
    await expect(backBtn).toBeVisible();
    
    await backBtn.click();
    
    // Should navigate back to login default screen
    await expect(page.locator('[data-testid="login-screen"]')).toBeVisible();
  });

  test('OTP fields use native numeric keyboard hints without an application keypad', async ({ page }) => {
    await page.route('**/api/me', (route) => route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ code: 'AUTHENTICATION_REQUIRED' }),
    }));
    await page.goto('/login.html');

    await expect(page.locator('.mobile-keypad')).toHaveCount(0);
    const loginOtpInputs = page.locator('[data-testid="login-otp-group"] .otp-input__box');
    await expect(loginOtpInputs).toHaveCount(6);
    await expect(loginOtpInputs.first()).toHaveAttribute('inputmode', 'numeric');
    await expect(loginOtpInputs.first()).toHaveAttribute('autocomplete', 'one-time-code');

    await page.goto('/');

    await expect(page.locator('.mobile-keypad')).toHaveCount(0);
    const registrationOtpInputs = page.locator('.otp-input__box');
    expect(await registrationOtpInputs.count()).toBeGreaterThan(0);
    for (const input of await registrationOtpInputs.all()) {
      await expect(input).toHaveAttribute('inputmode', 'numeric');
    }
  });
});

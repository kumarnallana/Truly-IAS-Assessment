import { test, expect } from '@playwright/test';
import { setLoginState, setOtpState, freezeEnvironment } from '../../helpers/states.js';

test.describe('Visual Regression - Login Flow', () => {
  // Test matrix will run against the configured viewports automatically via Playwright projects

  test('Login Default (State 1)', async ({ page }) => {
    await setLoginState(page, 'login-screen');
    // Basic structural check before capturing visual
    let overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
    
    await expect(page).toHaveScreenshot('login-state-1-default.png');
  });

  test('Login Invalid Credentials (State 2)', async ({ page }) => {
    await setLoginState(page, 'login-screen');
    await page.evaluate(() => {
      document.querySelector('[data-testid="error-login"]').classList.remove('hidden');
      document.querySelector('[data-testid="login-email"]').classList.add('input--error');
      document.querySelector('[data-testid="login-email"]').value = 'invalid@email.com';
      document.querySelector('[data-testid="login-password"]').classList.add('input--error');
      document.querySelector('[data-testid="login-password"]').value = 'wrongpassword';
    });
    await expect(page).toHaveScreenshot('login-state-2-invalid.png');
  });

  test('MFA Method Selection (State 3)', async ({ page }) => {
    await setLoginState(page, 'login-mfa-choice-screen');
    await expect(page).toHaveScreenshot('login-state-3-method.png');
  });

  test('Email OTP (State 4)', async ({ page }) => {
    await setLoginState(page, 'login-otp-screen');
    await setOtpState(page, 'valid');
    await expect(page).toHaveScreenshot('login-state-4-otp.png');
  });

  test('Email OTP Wrong (State 5)', async ({ page }) => {
    await setLoginState(page, 'login-otp-screen');
    await setOtpState(page, 'wrong');
    await expect(page).toHaveScreenshot('login-state-5-otp-wrong.png');
  });

  test('Email OTP Expired (State 6)', async ({ page }) => {
    await setLoginState(page, 'login-otp-screen');
    await setOtpState(page, 'expired');
    await expect(page).toHaveScreenshot('login-state-6-otp-expired.png');
  });
});

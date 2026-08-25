import { test, expect } from '@playwright/test';
import { setOtpState, freezeEnvironment } from '../../helpers/states.js';

test.describe('Visual Regression - Registration Flow', () => {

  // Helper to show state
  async function setRegState(page, testId) {
    await page.goto('/index.html');
    await freezeEnvironment(page);
    await page.waitForTimeout(200);
    
    await page.evaluate((id) => {
      document.querySelectorAll('.screen').forEach(el => {
        el.classList.add('hidden');
        el.removeAttribute('data-active');
      });
      const active = document.querySelector(`[data-testid="${id}"]`);
      if (active) {
        active.classList.remove('hidden');
        active.setAttribute('data-active', 'true');
      }
    }, testId);
  }

  test('Registration Details (State 1)', async ({ page }) => {
    await setRegState(page, 'reg-details-screen');
    await expect(page).toHaveScreenshot('reg-state-1-details.png');
  });

  test('Registration Email OTP (State 2)', async ({ page }) => {
    await setRegState(page, 'reg-otp-screen');
    await setOtpState(page, 'valid'); // Assume same DOM structure/helpers or close enough
    await expect(page).toHaveScreenshot('reg-state-2-email-otp.png');
  });
  
  test('Registration Auth Setup (State 5)', async ({ page }) => {
    await setRegState(page, 'reg-auth-setup-screen');
    await expect(page).toHaveScreenshot('reg-state-5-auth-setup.png');
  });

  test('Registration Success (State 7)', async ({ page }) => {
    await setRegState(page, 'reg-success-screen');
    await expect(page).toHaveScreenshot('reg-state-7-success.png');
  });
});

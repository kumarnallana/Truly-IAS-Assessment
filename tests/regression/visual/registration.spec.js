import { test, expect } from '@playwright/test';
import { freezeEnvironment } from '../../helpers/states.js';

test.describe('Visual Regression - Registration Flow', () => {

  // Helper to show state
  async function setRegState(page, testId) {
    await freezeEnvironment(page);
    await page.goto('/index.html');
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

      if (id === 'email-otp-screen') {
        const values = ['4', '8', '2', '9', '1', '3'];
        active?.querySelectorAll('.otp-input__box').forEach((input, index) => {
          input.value = values[index];
        });
      }

      if (id === 'authenticator-setup-screen') {
        const qr = active?.querySelector('[data-testid="qr-image-el"]');
        if (qr) {
          const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 10 10"><rect width="10" height="10" fill="white"/><path fill="#111827" d="M1 1h3v3H1zm1 1v1h1V2zm4-1h3v3H6zm1 1v1h1V2zM1 6h3v3H1zm1 1v1h1V7zm3-2h1v1H5zm2 0h2v1H7zM5 7h1v2H5zm2 0h1v1H7zm1 1h1v1H8z"/></svg>`;
          qr.src = `data:image/svg+xml,${encodeURIComponent(svg)}`;
        }
      }
    }, testId);

    await expect(page.locator(`[data-testid="${testId}"]`)).toHaveAttribute('data-active', 'true');
  }

  test('Registration Details (State 1)', async ({ page }) => {
    await setRegState(page, 'registration-screen');
    await expect(page).toHaveScreenshot('reg-state-1-details.png');
  });

  test('Registration Email OTP (State 2)', async ({ page }) => {
    await setRegState(page, 'email-otp-screen');
    await expect(page).toHaveScreenshot('reg-state-2-email-otp.png');
  });
  
  test('Registration Auth Setup (State 5)', async ({ page }) => {
    await setRegState(page, 'authenticator-setup-screen');
    await expect(page).toHaveScreenshot('reg-state-5-auth-setup.png');
  });

  test('Registration Success (State 7)', async ({ page }) => {
    await setRegState(page, 'success-screen');
    await expect(page).toHaveScreenshot('reg-state-7-success.png');
  });
});

import { test, expect } from '@playwright/test';
import { setLoginState, setOtpState } from '../../helpers/states.js';

test.describe('Responsive Transition Preservation', () => {

  test('Email OTP state is preserved during 1023px -> 1024px -> 1023px resize', async ({ page }) => {
    // Start at Tablet width
    await page.setViewportSize({ width: 1023, height: 900 });
    await setLoginState(page, 'login-otp-screen');
    await setOtpState(page, 'valid');

    // Verify initial tablet state
    await expect(page.locator('[data-testid="login-otp-screen"]')).toBeVisible();
    const boxes = page.locator('.otp-input__box');
    await expect(boxes.nth(0)).toHaveValue('4');
    
    // Resize to Desktop
    await page.setViewportSize({ width: 1024, height: 900 });
    
    // Wait for layout calculation
    await page.waitForTimeout(100);

    // Verify state survived
    await expect(page.locator('[data-testid="login-otp-screen"]')).toBeVisible();
    await expect(boxes.nth(0)).toHaveValue('4');
    
    // Resize back to Tablet
    await page.setViewportSize({ width: 1023, height: 900 });
    await page.waitForTimeout(100);

    // Verify state survived again
    await expect(page.locator('[data-testid="login-otp-screen"]')).toBeVisible();
    await expect(boxes.nth(0)).toHaveValue('4');
  });

  test('No unexpected layout jump or horizontal overflow occurs during resize', async ({ page }) => {
    await page.setViewportSize({ width: 1023, height: 900 });
    await setLoginState(page, 'login-screen');

    let overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);

    // Resize to Desktop
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.waitForTimeout(100);

    overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);

    // Ensure the Brand Panel became visible (layout didn't jump unexpectedly but shifted correctly)
    const brandPanel = page.locator('.auth-card__brand-panel');
    await expect(brandPanel).toBeVisible();
  });
});

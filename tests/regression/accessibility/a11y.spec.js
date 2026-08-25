import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { setLoginState } from '../../helpers/states.js';

test.describe('Accessibility Regression', () => {
  test('Login screen should not have any automatically detectable accessibility issues', async ({ page }) => {
    await setLoginState(page, 'login-screen');
    
    // Explicit Axe check
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('OTP screen should not have any automatically detectable accessibility issues', async ({ page }) => {
    await setLoginState(page, 'login-otp-screen');
    
    // Explicit Axe check
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});

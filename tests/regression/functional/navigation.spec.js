import { test, expect } from '@playwright/test';
import { setLoginState } from '../../helpers/states.js';

test.describe('Functional Regression', () => {

  test('Mobile Back Button navigation works correctly', async ({ page }) => {
    // Only test on Mobile viewport where Back button is visible
    if (page.viewportSize().width > 767) {
      test.skip();
    }
    
    await setLoginState(page, 'login-mfa-choice-screen');
    
    const backBtn = page.locator('.btn--back');
    await expect(backBtn).toBeVisible();
    
    await backBtn.click();
    
    // Should navigate back to login default screen
    await expect(page.locator('[data-testid="login-screen"]')).toBeVisible();
  });
});

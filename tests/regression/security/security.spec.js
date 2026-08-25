import { test, expect } from '@playwright/test';

test.describe('Security Regression', () => {

  test('Passwords are never logged and JWT is not in localStorage', async ({ page }) => {
    const logs = [];
    page.on('console', msg => logs.push(msg.text()));
    
    await page.goto('/login.html');
    
    await page.evaluate(() => {
      document.querySelector('[data-testid="login-email"]').value = 'test@email.com';
      document.querySelector('[data-testid="login-password"]').value = 'SuperSecret123!';
      document.querySelector('[data-testid="login-submit-btn"]').click();
    });

    await page.waitForTimeout(500);

    // Verify localStorage doesn't contain JWT
    const localStorageData = await page.evaluate(() => JSON.stringify(window.localStorage));
    expect(localStorageData).not.toContain('jwt');
    expect(localStorageData).not.toContain('token');
    
    // Verify logs do not contain the password
    const allLogs = logs.join(' ');
    expect(allLogs).not.toContain('SuperSecret123!');
  });
});

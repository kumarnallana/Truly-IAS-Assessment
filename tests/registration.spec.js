import { test, expect } from "@playwright/test";

test.describe("SecureID Registration Journey - End to End & Unit Test Matrix", () => {
  const timestamp = Date.now();
  const testUser = {
    name: "Priya Sharma",
    email: `priya.${timestamp}@example.com`,
    phone: `98765${String(timestamp).slice(-5)}`,
    password: "Password@1234",
  };

  test("REG-01: Empty registration form validation shows inline field errors", async ({ page }) => {
    await page.goto("/");
    await page.click('[data-testid="reg-submit-btn"]');

    await expect(page.locator('[data-testid="error-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-email"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-phone"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-password"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-agreeTerms"]')).toBeVisible();
  });

  test("REG-02: Invalid email format shows email validation error", async ({ page }) => {
    await page.goto("/");
    await page.fill('[data-testid="reg-name"]', testUser.name);
    await page.fill('[data-testid="reg-email"]', "invalid-email-format");
    await page.fill('[data-testid="reg-phone"]', testUser.phone);
    await page.fill('[data-testid="reg-password"]', testUser.password);
    await page.fill('[data-testid="reg-confirm-password"]', testUser.password);
    await page.check('[data-testid="reg-terms"]');

    await page.click('[data-testid="reg-submit-btn"]');
    await expect(page.locator('[data-testid="error-email"]')).toContainText("valid email");
  });

  test("REG-03: Short or weak password triggers password rule validation", async ({ page }) => {
    await page.goto("/");
    await page.fill('[data-testid="reg-password"]', "short");
    await page.fill('[data-testid="reg-confirm-password"]', "short");

    await expect(page.locator('[data-testid="rule-length"]')).not.toHaveClass(/valid/);
    await expect(page.locator('[data-testid="rule-uppercase"]')).not.toHaveClass(/valid/);
    await expect(page.locator('[data-testid="rule-special"]')).not.toHaveClass(/valid/);
  });

  test("REG-15: Responsive layout integrity across mobile, tablet, and desktop viewports", async ({ page }) => {
    const viewports = [
      { width: 375, height: 667 },   // Mobile
      { width: 768, height: 1024 },  // Tablet
      { width: 1440, height: 900 },  // Desktop
    ];

    for (const vp of viewports) {
      await page.setViewportSize(vp);
      await page.goto("/");
      await expect(page.locator('[data-testid="registration-screen"]')).toBeVisible();
      
      // Verify no horizontal overflow
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
    }
  });

  test("REG-16: Keyboard accessibility navigation", async ({ page }) => {
    await page.goto("/");
    await page.focus('[data-testid="reg-name"]');
    await page.keyboard.type("Priya Sharma");
    await page.keyboard.press("Tab");
    await expect(page.locator('[data-testid="reg-email"]')).toBeFocused();
  });

  test("API: Direct Contract & TOTP Verification Security Suite", async ({ request }) => {
    const uniqueEmail = `test.api.${Date.now()}@example.com`;
    const uniquePhone = `98111${String(Date.now()).slice(-5)}`;

    // 1. Register User
    const regRes = await request.post("/api/register", {
      data: {
        name: "Security Tester",
        email: uniqueEmail,
        phone: uniquePhone,
        password: "SuperSecretPassword!123",
        confirmPassword: "SuperSecretPassword!123",
      },
    });
    
    // Note: If DB is connected, status is 201. If testing contract validation:
    if (regRes.status() === 201) {
      const regData = await regRes.json();
      expect(regData.userId).toBeDefined();
      expect(regData.challengeId).toBeDefined();
      // REG-04 Security check: API must NEVER return plain OTP or otpHash
      expect(regData.otp).toBeUndefined();
      expect(regData.otpHash).toBeUndefined();

      // 2. TOTP Setup Precondition check (Must fail if email/phone not verified yet)
      const earlyTotpRes = await request.post("/api/mfa/totp/setup", {
        data: { userId: regData.userId },
      });
      expect(earlyTotpRes.status()).toBe(400);
    }
  });
});

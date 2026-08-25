import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("SecureID Visual & Accessibility Baselines", () => {
  // A helper to freeze dynamic UI elements to ensure deterministic snapshots
  const freezeDynamicContent = async (page) => {
    await page.evaluate(() => {
      const timers = document.querySelectorAll('[data-testid$="-expiry-timer"]');
      timers.forEach(t => { t.textContent = "00:00"; });
      
      const qrCode = document.querySelector('[data-testid="qr-image-el"]');
      if (qrCode) qrCode.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"; // 1x1 transparent pixel
      
      const manualKey = document.querySelector('[data-testid="manual-secret-key"]');
      if (manualKey) manualKey.textContent = "FROZEN_KEY_FOR_SNAPSHOTS";
    });
  };

  const a11yCheck = async (page) => {
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  };

  test.describe("Registration Flow", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/index.html");
    });

    test("State 1: Details", async ({ page }) => {
      await page.evaluate(() => window.showScreen("registration"));
      await freezeDynamicContent(page);
      await expect(page).toHaveScreenshot("registration-state-1-details.png");
      await a11yCheck(page);
    });

    test("State 2: Email OTP", async ({ page }) => {
      await page.evaluate(() => {
        window.showScreen("emailOtp");
        document.querySelector('[data-testid="email-otp-error"]').classList.add("hidden");
      });
      await freezeDynamicContent(page);
      await expect(page).toHaveScreenshot("registration-state-2-email-otp.png");
      await a11yCheck(page);
    });

    test("State 2a: Email OTP Error", async ({ page }) => {
      await page.evaluate(() => {
        window.showScreen("emailOtp");
        const err = document.querySelector('[data-testid="email-otp-error"]');
        err.classList.remove("hidden");
        err.textContent = "Incorrect code. Please try again.";
      });
      await freezeDynamicContent(page);
      await expect(page).toHaveScreenshot("registration-state-2a-email-error.png");
    });

    test("State 2b: Email OTP Expired", async ({ page }) => {
      await page.evaluate(() => {
        window.showScreen("emailOtp");
        const err = document.querySelector('[data-testid="email-otp-error"]');
        err.classList.remove("hidden");
        err.textContent = "This code has expired.";
      });
      await freezeDynamicContent(page);
      await expect(page).toHaveScreenshot("registration-state-2b-email-expired.png");
    });

    test("State 3: Mobile OTP", async ({ page }) => {
      await page.evaluate(() => {
        window.showScreen("smsOtp");
        document.querySelector('[data-testid="sms-otp-error"]').classList.add("hidden");
      });
      await freezeDynamicContent(page);
      await expect(page).toHaveScreenshot("registration-state-3-mobile-otp.png");
      await a11yCheck(page);
    });

    test("State 4: MFA Setup Choice", async ({ page }) => {
      await page.evaluate(() => window.showScreen("mfaChoice"));
      await freezeDynamicContent(page);
      await expect(page).toHaveScreenshot("registration-state-4-mfa-choice.png");
      await a11yCheck(page);
    });

    test("State 5: Authenticator Setup QR", async ({ page }) => {
      await page.evaluate(() => window.showScreen("authenticatorSetup"));
      await freezeDynamicContent(page);
      await expect(page).toHaveScreenshot("registration-state-5-mfa-qr.png");
      await a11yCheck(page);
    });

    test("State 6: MFA Verify", async ({ page }) => {
      await page.evaluate(() => {
        window.showScreen("mfaVerify");
        document.querySelector('[data-testid="mfa-error-banner"]').classList.add("hidden");
      });
      await freezeDynamicContent(page);
      await expect(page).toHaveScreenshot("registration-state-6-mfa-verify.png");
      await a11yCheck(page);
    });

    test("State 7: Registration Success", async ({ page }) => {
      await page.evaluate(() => window.showScreen("success"));
      await freezeDynamicContent(page);
      await expect(page).toHaveScreenshot("registration-state-7-success.png");
      await a11yCheck(page);
    });
  });

  test.describe("Login Flow", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/login.html");
    });

    test("State 1: Default Login", async ({ page }) => {
      await page.evaluate(() => window.showScreen("login-screen"));
      await freezeDynamicContent(page);
      await expect(page).toHaveScreenshot("login-state-1-default.png");
      await a11yCheck(page);
    });

    test("State 2: Invalid Credentials", async ({ page }) => {
      await page.evaluate(() => {
        window.showScreen("login-screen");
        document.querySelector('[data-testid="error-login"]').classList.remove("hidden");
      });
      await freezeDynamicContent(page);
      await expect(page).toHaveScreenshot("login-state-2-invalid.png");
    });
    
    test("State 3: Choose Method", async ({ page }) => {
      await page.evaluate(() => window.showScreen("login-mfa-choice-screen"));
      await freezeDynamicContent(page);
      await expect(page).toHaveScreenshot("login-state-3-method.png");
      await a11yCheck(page);
    });

    test("State 4: Email OTP", async ({ page }) => {
      await page.evaluate(() => {
        window.showScreen("login-otp-screen");
        document.querySelector('[data-testid="login-otp-error"]').classList.add("hidden");
        document.querySelector('[data-testid="login-otp-expired"]').classList.add("hidden");
      });
      await freezeDynamicContent(page);
      await expect(page).toHaveScreenshot("login-state-4-email-otp.png");
      await a11yCheck(page);
    });
  });
});

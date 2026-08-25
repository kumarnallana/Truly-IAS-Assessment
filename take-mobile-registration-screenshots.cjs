const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = process.env.ARTIFACT_DIR || __dirname;

async function takeMobileRegistrationScreenshots() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 12/13 Pro
    deviceScaleFactor: 1
  });
  const page = await context.newPage();

  // Load the local HTML file
  const filePath = `file://${path.resolve(__dirname, 'public/index.html')}`;
  console.log(`Loading: ${filePath}`);
  await page.goto(filePath);

  // Helper to wait
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Helper to show a specific screen
  async function showScreen(testId) {
    await page.evaluate((id) => {
      document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
      document.querySelectorAll('.screen').forEach(s => s.removeAttribute('data-active'));
      const target = document.querySelector(`[data-testid="${id}"]`);
      if (target) {
        target.classList.remove('hidden');
        target.setAttribute('data-active', 'true');
      }
    }, testId);
    await wait(200); // allow layout to settle
  }

  // Helper to mock the OTP timer
  async function mockTimer(testId) {
    await page.evaluate((id) => {
      const el = document.querySelector(`[data-testid="${id}"]`);
      if (el) el.textContent = '05:00';
    }, testId);
  }

  console.log('Capturing State 1: Details');
  await showScreen('registration-screen');
  await page.screenshot({ path: path.join(OUT_DIR, 'mobile-reg-state-1-details.png'), fullPage: true });

  console.log('Capturing State 2: Email OTP');
  await showScreen('email-otp-screen');
  await mockTimer('email-expiry-timer');
  await page.screenshot({ path: path.join(OUT_DIR, 'mobile-reg-state-2-email-otp.png'), fullPage: true });

  console.log('Capturing State 3: SMS OTP');
  await showScreen('sms-otp-screen');
  await mockTimer('sms-expiry-timer');
  await page.screenshot({ path: path.join(OUT_DIR, 'mobile-reg-state-3-sms-otp.png'), fullPage: true });

  console.log('Capturing State 4: MFA Choice');
  await showScreen('mfa-choice-screen');
  await page.screenshot({ path: path.join(OUT_DIR, 'mobile-reg-state-4-mfa-choice.png'), fullPage: true });

  console.log('Capturing State 5: Authenticator Setup');
  await showScreen('authenticator-setup-screen');
  // Mock the QR code
  await page.evaluate(() => {
    const img = document.querySelector('[data-testid="qr-image-el"]');
    if (img) img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='; // 1x1 transparent
  });
  await wait(200);
  await page.screenshot({ path: path.join(OUT_DIR, 'mobile-reg-state-5-auth-setup.png'), fullPage: true });

  console.log('Capturing State 6: MFA Verify');
  await showScreen('mfa-verify-screen');
  await page.screenshot({ path: path.join(OUT_DIR, 'mobile-reg-state-6-mfa-verify.png'), fullPage: true });

  console.log('Capturing State 7: Success');
  await showScreen('success-screen');
  await page.screenshot({ path: path.join(OUT_DIR, 'mobile-reg-state-7-success.png'), fullPage: true });

  await browser.close();
  console.log('Screenshots captured successfully!');
}

takeMobileRegistrationScreenshots().catch(console.error);

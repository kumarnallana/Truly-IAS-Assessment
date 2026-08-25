const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = process.env.ARTIFACT_DIR || __dirname;

async function takeMobileLoginScreenshots() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 12/13 Pro
    deviceScaleFactor: 1
  });
  const page = await context.newPage();

  console.log('Navigating to login page...');
  await page.goto('http://localhost:4000/login.html');
  await new Promise(r => setTimeout(r, 500));

  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  async function showScreen(testId) {
    await page.evaluate((id) => {
      document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
      document.querySelectorAll('.screen').forEach(s => s.removeAttribute('data-active'));
      const target = document.querySelector(`[data-testid="${id}"]`);
      if (target) {
        target.classList.remove('hidden');
        target.setAttribute('data-active', 'true');
      }
      
      // hide alerts and reset otp timers if returning
      document.querySelectorAll('.alert-banner').forEach(a => a.classList.add('hidden'));
    }, testId);
    await wait(200);
  }

  // Helper to mock the OTP timer
  async function mockTimer(testId) {
    await page.evaluate((id) => {
      const el = document.querySelector(`[data-testid="${id}"]`);
      if (el) el.textContent = '05:00';
    }, testId);
  }

  // Helper to trigger alert banners for error states
  async function triggerAlert(errorId) {
    await page.evaluate((id) => {
      const err = document.querySelector(`[data-testid="${id}"]`);
      if (err) err.classList.remove('hidden');
    }, errorId);
  }

  console.log('Capturing State 1: Login Default');
  await showScreen('login-screen');
  await page.screenshot({ path: path.join(OUT_DIR, 'mobile-login-state-1-default.png'), fullPage: true });

  console.log('Capturing State 2: Login Invalid');
  await showScreen('login-screen');
  await triggerAlert('error-login');
  await page.screenshot({ path: path.join(OUT_DIR, 'mobile-login-state-2-invalid.png'), fullPage: true });

  console.log('Capturing State 3: MFA Choice');
  await showScreen('login-mfa-choice-screen');
  await page.screenshot({ path: path.join(OUT_DIR, 'mobile-login-state-3-mfa-choice.png'), fullPage: true });

  console.log('Capturing State 4: Email OTP Default');
  await showScreen('login-otp-screen');
  await mockTimer('login-expiry-timer');
  await page.screenshot({ path: path.join(OUT_DIR, 'mobile-login-state-4-otp-default.png'), fullPage: true });

  console.log('Capturing State 5: Email OTP Wrong');
  await showScreen('login-otp-screen');
  await triggerAlert('login-otp-error');
  // Fill 123456 in OTP
  await page.evaluate(() => {
    const inputs = document.querySelectorAll('.otp-input__box');
    inputs.forEach((inp, idx) => inp.value = (idx + 1).toString());
    inputs.forEach(inp => inp.classList.add('input--error'));
  });
  await wait(200);
  await page.screenshot({ path: path.join(OUT_DIR, 'mobile-login-state-5-otp-wrong.png'), fullPage: true });

  console.log('Capturing State 6: Email OTP Expired');
  await showScreen('login-otp-screen');
  // reset OTP values
  await page.evaluate(() => {
    const inputs = document.querySelectorAll('.otp-input__box');
    inputs.forEach(inp => {
      inp.value = '';
      inp.classList.remove('input--error');
    });
    // set timer layout
    const timerText = document.querySelector('[data-testid="login-otp-timer-text"]');
    if (timerText) timerText.classList.add('hidden');
    
    const expiredText = document.querySelector('[data-testid="login-otp-expired-timer-text"]');
    if (expiredText) expiredText.classList.remove('hidden');

    const resendBtn = document.querySelector('[data-testid="login-resend-btn"]');
    if (resendBtn) resendBtn.classList.remove('hidden');

    const bottomLink = document.querySelector('.auth-footer');
    if (bottomLink) bottomLink.classList.add('hidden');
  });
  await triggerAlert('login-otp-expired');
  await wait(200);
  await page.screenshot({ path: path.join(OUT_DIR, 'mobile-login-state-6-otp-expired.png'), fullPage: true });

  await browser.close();
  console.log('Mobile Login Screenshots captured successfully!');
}

takeMobileLoginScreenshots().catch(console.error);

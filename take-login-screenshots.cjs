const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function captureLoginStates() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log('Navigating to login page...');
  const filePath = `file://${path.resolve(__dirname, 'public/login.html')}`;
  await page.goto(filePath);
  await new Promise(r => setTimeout(r, 500));

  // Helper to hide all screens and show one
  const showScreen = async (testId) => {
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
  };

  // State 2: Invalid Credentials
  console.log('Capturing State 2: Invalid Credentials');
  await showScreen('login-screen');
  await page.evaluate(() => {
    document.querySelector('[data-testid="error-login"]').classList.remove('hidden');
    document.querySelector('[data-testid="login-email"]').classList.add('input--error');
    document.querySelector('[data-testid="login-email"]').value = 'priya.sharma@email.com';
    document.querySelector('[data-testid="login-password"]').classList.add('input--error');
    document.querySelector('[data-testid="login-password"]').value = 'wrongpassword';
  });
  await new Promise(r => setTimeout(r, 200));
  await page.screenshot({ path: 'login-state-2-invalid.png' });

  // State 3: Choose Method
  console.log('Capturing State 3: Choose Method');
  await showScreen('login-mfa-choice-screen');
  await new Promise(r => setTimeout(r, 200));
  await page.screenshot({ path: 'login-state-3-method.png' });

  // State 4: Email OTP
  console.log('Capturing State 4: Email OTP');
  await showScreen('login-otp-screen');
  await page.evaluate(() => {
    // reset from other states just in case
    document.querySelector('[data-testid="login-otp-error"]').classList.add('hidden');
    document.querySelector('[data-testid="login-otp-expired"]').classList.add('hidden');
    document.querySelectorAll('.otp-input__box').forEach(el => el.classList.remove('input--error'));
    
    const boxes = document.querySelectorAll('.otp-input__box');
    const vals = ['4','8','2','9','1','3'];
    boxes.forEach((box, i) => { box.value = vals[i]; });
  });
  await new Promise(r => setTimeout(r, 200));
  await page.screenshot({ path: 'login-state-4-otp.png' });

  // State 5: Wrong OTP
  console.log('Capturing State 5: Wrong OTP');
  await showScreen('login-otp-screen');
  await page.evaluate(() => {
    document.querySelector('[data-testid="login-otp-error"]').classList.remove('hidden');
    const boxes = document.querySelectorAll('.otp-input__box');
    boxes.forEach(box => box.classList.add('input--error'));
    boxes[5].value = '4'; // changed last digit
  });
  await new Promise(r => setTimeout(r, 200));
  await page.screenshot({ path: 'login-state-5-otp-wrong.png' });

  // State 6: Expired OTP
  console.log('Capturing State 6: Expired OTP');
  await showScreen('login-otp-screen');
  await page.evaluate(() => {
    document.querySelector('[data-testid="login-otp-error"]').classList.add('hidden');
    document.querySelector('[data-testid="login-otp-expired"]').classList.remove('hidden');
    
    // Clear boxes
    const boxes = document.querySelectorAll('.otp-input__box');
    boxes.forEach(box => {
      box.classList.add('input--error'); // Sometimes expired is red? we'll see
      box.value = '';
    });
    
    document.querySelector('[data-testid="login-otp-timer-text"]').classList.add('hidden');
    document.querySelector('[data-testid="login-otp-expired-timer-text"]').classList.remove('hidden');
    
    // Switch button to Resend New Code
    const resendLink = document.querySelector('.auth-footer');
    if (resendLink) resendLink.classList.add('hidden');
    
    const resendBtn = document.querySelector('[data-testid="login-resend-btn"]');
    resendBtn.classList.remove('hidden');
    resendBtn.textContent = 'Resend New Code';
  });
  await new Promise(r => setTimeout(r, 200));
  await page.screenshot({ path: 'login-state-6-otp-expired.png' });

  await browser.close();
  console.log('Done!');
}

captureLoginStates().catch(console.error);

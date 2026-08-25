import { expect } from '@playwright/test';

// Freeze clock and random UUID generation
export async function freezeEnvironment(page) {
  // Freeze clock to a fixed date
  await page.addInitScript(() => {
    const fixedTime = new Date('2026-08-25T12:00:00Z').getTime();
    const OriginalDate = window.Date;
    class MockDate extends OriginalDate {
      constructor(...args) {
        if (args.length === 0) {
          super(fixedTime);
        } else {
          super(...args);
        }
      }
      static now() {
        return fixedTime;
      }
    }
    window.Date = MockDate;
    
    // Mock crypto.randomUUID if used for any random keys
    if (window.crypto && window.crypto.randomUUID) {
      let counter = 0;
      window.crypto.randomUUID = () => `00000000-0000-0000-0000-00000000000${counter++}`;
    }
    
    // Mock Math.random
    let seed = 1;
    window.Math.random = () => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };
  });
}

// Navigate to login and explicitly show a specific state
export async function setLoginState(page, testId) {
  await page.goto('/login.html');
  await freezeEnvironment(page);
  // Wait for load
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
  }, testId);
}

// Set OTP visual state explicitly for deterministic tests
export async function setOtpState(page, state) {
  await page.evaluate((s) => {
    const errorEl = document.querySelector('[data-testid="login-otp-error"]');
    if (errorEl) errorEl.classList.add('hidden');
    const expEl = document.querySelector('[data-testid="login-otp-expired"]');
    if (expEl) expEl.classList.add('hidden');
    
    document.querySelectorAll('.otp-input__box').forEach(el => {
      el.classList.remove('input--error');
      el.value = '';
    });
    
    const timerText = document.querySelector('[data-testid="login-otp-timer-text"]');
    if (timerText) timerText.classList.remove('hidden');
    
    const expTimerText = document.querySelector('[data-testid="login-otp-expired-timer-text"]');
    if (expTimerText) expTimerText.classList.add('hidden');
    
    const resendLink = document.querySelector('.auth-footer');
    if (resendLink) resendLink.classList.remove('hidden');
    
    const resendBtn = document.querySelector('[data-testid="login-resend-btn"]');
    if (resendBtn) resendBtn.classList.add('hidden');
    
    if (s === 'valid') {
      const vals = ['4','8','2','9','1','3'];
      document.querySelectorAll('.otp-input__box').forEach((box, i) => { box.value = vals[i]; });
    } else if (s === 'wrong') {
      if (errorEl) errorEl.classList.remove('hidden');
      const vals = ['4','8','2','9','1','4'];
      document.querySelectorAll('.otp-input__box').forEach((box, i) => { 
        box.classList.add('input--error');
        box.value = vals[i]; 
      });
    } else if (s === 'expired') {
      if (expEl) expEl.classList.remove('hidden');
      document.querySelectorAll('.otp-input__box').forEach(box => {
        box.classList.add('input--error');
      });
      if (timerText) timerText.classList.add('hidden');
      if (expTimerText) expTimerText.classList.remove('hidden');
      if (resendLink) resendLink.classList.add('hidden');
      if (resendBtn) {
        resendBtn.classList.remove('hidden');
        resendBtn.textContent = 'Resend New Code';
      }
    }
  }, state);
}

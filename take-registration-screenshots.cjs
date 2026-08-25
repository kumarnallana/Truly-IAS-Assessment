const { chromium } = require('playwright');
const path = require('path');

const OUT_DIR = process.env.ARTIFACT_DIR || __dirname;

async function takeRegistrationScreenshots() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();

  const filePath = `file://${path.resolve(__dirname, 'public/index.html')}`;
  await page.goto(filePath);

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
    }, testId);
    await wait(200);
  }

  await showScreen('registration-screen');
  await page.screenshot({ path: path.join(OUT_DIR, 'desktop-reg-state-1-details.png'), fullPage: true });

  await showScreen('email-otp-screen');
  await page.screenshot({ path: path.join(OUT_DIR, 'desktop-reg-state-2-email-otp.png'), fullPage: true });

  await showScreen('sms-otp-screen');
  await page.screenshot({ path: path.join(OUT_DIR, 'desktop-reg-state-3-sms-otp.png'), fullPage: true });

  await showScreen('mfa-choice-screen');
  await page.screenshot({ path: path.join(OUT_DIR, 'desktop-reg-state-4-mfa-choice.png'), fullPage: true });

  await showScreen('authenticator-setup-screen');
  await page.evaluate(() => {
    const img = document.querySelector('[data-testid="qr-image-el"]');
    if (img) img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  });
  await wait(200);
  await page.screenshot({ path: path.join(OUT_DIR, 'desktop-reg-state-5-auth-setup.png'), fullPage: true });

  await showScreen('mfa-verify-screen');
  await page.screenshot({ path: path.join(OUT_DIR, 'desktop-reg-state-6-mfa-verify.png'), fullPage: true });

  await showScreen('success-screen');
  await page.screenshot({ path: path.join(OUT_DIR, 'desktop-reg-state-7-success.png'), fullPage: true });

  await browser.close();
  console.log('Desktop screenshots captured successfully!');
}

takeRegistrationScreenshots().catch(console.error);

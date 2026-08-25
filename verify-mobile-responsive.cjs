const { chromium } = require('playwright');
const path = require('path');

async function verifyResponsive() {
  const browser = await chromium.launch();
  const widths = [320, 375, 390, 430];
  const states = [
    'registration-screen', 'email-otp-screen', 'sms-otp-screen',
    'mfa-choice-screen', 'authenticator-setup-screen', 'mfa-verify-screen', 'success-screen'
  ];

  const filePath = `file://${path.resolve(__dirname, 'public/index.html')}`;
  
  let hasOverflowError = false;

  for (const width of widths) {
    const context = await browser.newContext({ viewport: { width, height: 800 } });
    const page = await context.newPage();
    await page.goto(filePath);

    console.log(`\nTesting viewport: ${width}px`);

    for (const state of states) {
      await page.evaluate((id) => {
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        document.querySelectorAll('.screen').forEach(s => s.removeAttribute('data-active'));
        const target = document.querySelector(`[data-testid="${id}"]`);
        if (target) {
          target.classList.remove('hidden');
          target.setAttribute('data-active', 'true');
        }
      }, state);
      
      // wait for layout
      await new Promise(r => setTimeout(r, 100));

      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      if (hasOverflow) {
        console.error(`❌ Overflow detected at ${width}px on state: ${state}`);
        hasOverflowError = true;
      } else {
        console.log(`✅ No overflow at ${width}px on state: ${state}`);
      }
    }
    await context.close();
  }

  await browser.close();
  if (hasOverflowError) {
    process.exit(1);
  } else {
    console.log('\n✅ All mobile viewports passed responsive safety validation (no horizontal overflow).');
  }
}

verifyResponsive().catch(console.error);

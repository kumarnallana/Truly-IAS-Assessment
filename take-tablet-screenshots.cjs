const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = process.env.ARTIFACT_DIR || __dirname;

async function takeTabletScreenshots() {
  const browser = await chromium.launch();
  
  const viewports = [
    { w: 768, h: 1024, name: '768px' },
    { w: 820, h: 1180, name: '820px' },
    { w: 1023, h: 1366, name: '1023px' },
    { w: 1024, h: 1366, name: '1024px' }
  ];

  const regPath = 'http://localhost:4000/index.html';
  const logPath = 'http://localhost:4000/login.html';

  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.w, height: vp.h },
      deviceScaleFactor: 1
    });
    const page = await context.newPage();

    console.log(`Capturing Registration at ${vp.name}...`);
    await page.goto(regPath);
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(OUT_DIR, `tablet-reg-${vp.w}px.png`), fullPage: true });

    console.log(`Capturing Login at ${vp.name}...`);
    await page.goto(logPath);
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(OUT_DIR, `tablet-login-${vp.w}px.png`), fullPage: true });

    await context.close();
  }

  await browser.close();
  console.log('Tablet Screenshots captured successfully!');
}

takeTabletScreenshots().catch(console.error);

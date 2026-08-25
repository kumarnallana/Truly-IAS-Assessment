const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function verifyResizeTransition() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1023, height: 900 },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();

  const regPath = 'http://localhost:4000/index.html';
  const logPath = 'http://localhost:4000/login.html';

  const checkOverflow = async () => {
    return await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
  };

  console.log('--- Testing Login Boundary Transition (1023 <-> 1024) ---');
  await page.goto(logPath);
  
  console.log('Setting viewport to 1023px (Tablet/Mobile Composition)');
  await page.setViewportSize({ width: 1023, height: 900 });
  await page.waitForTimeout(200);
  
  let brandPanelVisible = await page.evaluate(() => {
    const el = document.querySelector('.auth-card__brand-panel');
    return el ? window.getComputedStyle(el).display !== 'none' : false;
  });
  let overflow = await checkOverflow();
  console.log(`1023px - Brand Panel Visible: ${brandPanelVisible} | Overflow: ${overflow}`);

  console.log('Resizing to 1024px (Desktop Composition)');
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.waitForTimeout(200);

  brandPanelVisible = await page.evaluate(() => {
    const el = document.querySelector('.auth-card__brand-panel');
    return el ? window.getComputedStyle(el).display !== 'none' : false;
  });
  overflow = await checkOverflow();
  console.log(`1024px - Brand Panel Visible: ${brandPanelVisible} | Overflow: ${overflow}`);

  console.log('Resizing back to 1023px');
  await page.setViewportSize({ width: 1023, height: 900 });
  await page.waitForTimeout(200);

  brandPanelVisible = await page.evaluate(() => {
    const el = document.querySelector('.auth-card__brand-panel');
    return el ? window.getComputedStyle(el).display !== 'none' : false;
  });
  overflow = await checkOverflow();
  console.log(`1023px (Post-Resize) - Brand Panel Visible: ${brandPanelVisible} | Overflow: ${overflow}`);


  console.log('\n--- Testing Registration Boundary Transition (1023 <-> 1024) ---');
  await page.goto(regPath);
  
  console.log('Setting viewport to 1023px (Single Column)');
  await page.setViewportSize({ width: 1023, height: 900 });
  await page.waitForTimeout(200);
  
  let gridStyle = await page.evaluate(() => {
    const el = document.querySelector('.auth-card__grid');
    return el ? window.getComputedStyle(el).display : null;
  });
  overflow = await checkOverflow();
  console.log(`1023px - Grid Display: ${gridStyle} | Overflow: ${overflow}`);

  console.log('Resizing to 1024px (Dual Column)');
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.waitForTimeout(200);

  gridStyle = await page.evaluate(() => {
    const el = document.querySelector('.auth-card__grid');
    return el ? window.getComputedStyle(el).display : null;
  });
  overflow = await checkOverflow();
  console.log(`1024px - Grid Display: ${gridStyle} | Overflow: ${overflow}`);

  console.log('Resizing back to 1023px');
  await page.setViewportSize({ width: 1023, height: 900 });
  await page.waitForTimeout(200);

  gridStyle = await page.evaluate(() => {
    const el = document.querySelector('.auth-card__grid');
    return el ? window.getComputedStyle(el).display : null;
  });
  overflow = await checkOverflow();
  console.log(`1023px (Post-Resize) - Grid Display: ${gridStyle} | Overflow: ${overflow}`);

  await browser.close();
  console.log('\nBoundary transition tests completed.');
}

verifyResizeTransition().catch(console.error);

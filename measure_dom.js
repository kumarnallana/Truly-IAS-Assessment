import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    await page.goto('http://localhost:4000/login.html');
    
    // Explicitly wait for the auth-card to be visible
    await page.waitForSelector('.auth-card');

    const loginCard = await page.locator('.auth-card').boundingBox();
    const loginBrand = await page.locator('.auth-card__brand-panel').boundingBox();
    const loginForm = await page.locator('.auth-card__form-panel').boundingBox();

    const data = {
      login: {
        card: loginCard,
        brandPanel: loginBrand,
        formPanel: loginForm
      }
    };

    fs.writeFileSync('dom-measurements.json', JSON.stringify(data, null, 2));
    console.log('Measurements saved to dom-measurements.json');
  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
})();

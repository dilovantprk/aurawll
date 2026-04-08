const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
  
  await page.goto('http://localhost:8080/');
  await page.waitForTimeout(1000);
  
  // mock user being a guest
  await page.evaluate(() => {
    // try to navigate
    if (typeof navigateTo === 'function') navigateTo('view-settings');
  });
  await page.waitForTimeout(1000);
  
  const cta = await page.evaluate(() => {
      const el = document.getElementById('guest-cta-box');
      return el ? el.className : 'NOT FOUND';
  });
  console.log('CTA CLASSES:', cta);
  await browser.close();
})();

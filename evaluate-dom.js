const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({ 
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: "new" 
  });
  const page = await browser.newPage();
  await page.goto('http://localhost:3002', { waitUntil: 'networkidle0' });
  
  const mapContainerSize = await page.evaluate(() => {
    const el = document.querySelector('.maplibregl-canvas-container');
    if (!el) return 'No maplibregl canvas container found';
    const rect = el.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  });
  
  const mapOuterSize = await page.evaluate(() => {
    const el = document.querySelector('.relative.w-full.h-full');
    if (!el) return 'No relative w-full h-full found';
    const rect = el.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  });

  console.log('Canvas Container:', mapContainerSize);
  console.log('Outer Map Div:', mapOuterSize);

  await browser.close();
})();

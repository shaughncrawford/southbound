const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome';
const FONT_PATH = path.join(__dirname, 'fonts', 'DharmaGothicE_Heavy_R.otf');

const items = [
  { text: 'SOUTHBOUND', file: 'southbound-wordmark.png' },
  { text: 'THEY SEE OUTLAWS.<br>WE SEE FREEDOM.', file: 'outlaws-freedom.png' },
  { text: 'NO PERMISSION NEEDED.', file: 'no-permission.png' },
  { text: 'THE STREETS NEVER<br>LOOKED THIS GOOD.', file: 'streets-never.png' },
  { text: 'BUILT FOR THE LEAN.<br>WORN FOR THE LOOK.', file: 'built-lean.png' },
  { text: "DON'T SLEEP.", file: 'dont-sleep.png' },
];

// Encode font as base64 for embedding
const fontBase64 = fs.readFileSync(FONT_PATH).toString('base64');

function buildHTML(text) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @font-face {
    font-family: 'Dharma Gothic E';
    src: url(data:font/otf;base64,${fontBase64}) format('opentype');
    font-weight: 900;
    font-style: normal;
  }
  * { margin: 0; padding: 0; }
  body { background: transparent; }
  .text {
    font-family: 'Dharma Gothic E', sans-serif;
    font-weight: 900;
    font-size: 200px;
    color: #F5F0EB;
    line-height: 0.9;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    white-space: nowrap;
    display: inline-block;
    padding: 20px 40px;
  }
</style>
</head>
<body><div class="text">${text}</div></body>
</html>`;
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 2400, height: 1200, deviceScaleFactor: 2 });

  // Test font loading with first item
  const testHTML = buildHTML('TEST');
  await page.setContent(testHTML, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));

  const fontCheck = await page.evaluate(async () => {
    await document.fonts.ready;
    const fonts = [];
    document.fonts.forEach(f => fonts.push({ family: f.family, status: f.status }));
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = "900 200px 'Dharma Gothic E'";
    const w1 = ctx.measureText('SOUTHBOUND').width;
    ctx.font = "200px sans-serif";
    const w2 = ctx.measureText('SOUTHBOUND').width;
    return { fonts, dharmaWidth: w1, sansWidth: w2, different: w1 !== w2 };
  });
  console.log('Font check:', JSON.stringify(fontCheck, null, 2));

  for (const item of items) {
    console.log(`Generating ${item.file}...`);

    await page.setContent(buildHTML(item.text), { waitUntil: 'domcontentloaded' });
    await page.evaluate(async () => await document.fonts.ready);
    await new Promise(r => setTimeout(r, 500));

    const box = await page.evaluate(() => {
      const el = document.querySelector('.text');
      const rect = el.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    });

    await page.screenshot({
      path: path.join(__dirname, item.file),
      clip: { x: box.x, y: box.y, width: box.width, height: box.height },
      omitBackground: true,
    });

    console.log(`  Saved ${item.file} (${Math.round(box.width)}x${Math.round(box.height)} CSS px)`);
  }

  await browser.close();
  console.log('Done!');
})();

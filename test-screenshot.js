const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');
const puppeteer = require('puppeteer');
const fs = require('fs');

const app = express();
const PORT = 3000;
const db = new Database(path.join(__dirname, 'data', 'webhub.db'));

const screenshotsDir = path.join(__dirname, 'public', 'screenshots');
if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/test-screenshot', async (req, res) => {
  const project = db.prepare('SELECT * FROM projects LIMIT 1').get();
  if (!project) return res.json({ success: false, message: 'no project' });

  console.log('Starting screenshot for:', project.url);
  let browser;
  try {
    console.log('1. Launching browser...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });
    console.log('2. Browser launched OK');

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    console.log('3. Page created, navigating to:', project.url);

    try {
      await page.goto(project.url, { waitUntil: 'domcontentloaded', timeout: 10000 });
      console.log('4. Navigation succeeded');
    } catch (navErr) {
      console.log('4. Navigation error (continuing):', navErr.message);
    }

    console.log('5. Taking screenshot...');
    const buf = await page.screenshot({ type: 'png' });
    console.log('6. Screenshot buffer size:', buf.length);

    const filename = `test-${Date.now()}.png`;
    const filepath = path.join(screenshotsDir, filename);
    fs.writeFileSync(filepath, buf);
    console.log('7. Written to:', filepath, 'exists:', fs.existsSync(filepath), 'size:', fs.statSync(filepath).size);

    await browser.close();
    res.json({ success: true, path: `/screenshots/${filename}`, size: buf.length });
  } catch (err) {
    console.error('SCREENSHOT ERROR:', err.message);
    console.error('Stack:', err.stack);
    if (browser) await browser.close().catch(() => {});
    res.json({ success: false, error: err.message, stack: err.stack });
  }
});

app.listen(PORT, () => console.log(`Test server on ${PORT}`));

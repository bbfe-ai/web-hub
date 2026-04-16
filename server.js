const express = require('express');
const path = require('path');
const cors = require('cors');
const Database = require('better-sqlite3');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

const db = new Database(path.join(__dirname, 'data', 'webhub.db'));

db.exec(`PRAGMA foreign_keys = ON`);

// Migrate old thumbnail-only records to project_screenshots table
const oldThumbnails = db.prepare("SELECT id, thumbnail FROM projects WHERE thumbnail != ''").all();
for (const p of oldThumbnails) {
  const existing = db.prepare(
    "SELECT COUNT(*) as cnt FROM project_screenshots WHERE project_id = ? AND path = ?"
  ).get(p.id, p.thumbnail);
  if (existing.cnt === 0) {
    db.prepare('INSERT INTO project_screenshots (project_id, path, thumbnail) VALUES (?, ?, 1)').run(p.id, p.thumbnail);
  }
}

db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    username TEXT DEFAULT '',
    password TEXT DEFAULT '',
    description TEXT DEFAULT '',
    category TEXT DEFAULT '默认',
    thumbnail TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS project_screenshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    path TEXT NOT NULL,
    thumbnail BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  )
`);

// Screenshot cache directory
const screenshotsDir = path.join(__dirname, 'public', 'screenshots');
const fs = require('fs');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Browser pool for screenshots
let browserPool = null;
let isScreenshotting = {};

async function getBrowser() {
  if (!browserPool || !browserPool.isConnected()) {
    browserPool = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process',
        '--no-zygote'
      ]
    });
  }
  return browserPool;
}

// Shared screenshot capture logic — saves to project_screenshots table
async function executeCapture(projectId, url) {
  if (isScreenshotting[projectId]) return null;
  isScreenshotting[projectId] = true;

  const currentCount = db.prepare('SELECT COUNT(*) as cnt FROM project_screenshots WHERE project_id = ?').get(projectId);
  if (currentCount.cnt >= 4) {
    delete isScreenshotting[projectId];
    return null;
  }

  const timestamp = Date.now();
  const filename = `project-${projectId}-${timestamp}.png`;
  const filepath = path.join(screenshotsDir, filename);

  try {
    const browser = await getBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    try {
      await Promise.race([
        page.goto(url, { waitUntil: 'domcontentloaded', timeout: 8000 }),
        new Promise(resolve => setTimeout(resolve, 8000))
      ]);
    } catch (navErr) {
      console.log(`⚠️  Navigation timeout for project ${projectId}, taking screenshot anyway`);
    }

    const screenshotBuf = await page.screenshot({ type: 'png' });
    await page.close();

    // Verify screenshot is valid (must have PNG header and reasonable size)
    if (!screenshotBuf || screenshotBuf.length < 1000) {
      console.log(`⚠️  Screenshot too small for project ${projectId} (${screenshotBuf ? screenshotBuf.length : 0} bytes)`);
      delete isScreenshotting[projectId];
      return null;
    }

    // Write file and verify
    fs.writeFileSync(filepath, screenshotBuf);
    if (!fs.existsSync(filepath) || fs.statSync(filepath).size < 1000) {
      console.log(`⚠️  Screenshot file write failed for project ${projectId}`);
      delete isScreenshotting[projectId];
      return null;
    }

    // Save to screenshots table
    const existing = db.prepare('SELECT COUNT(*) as cnt FROM project_screenshots WHERE project_id = ?').get(projectId);
    const isThumb = existing.cnt === 0;

    db.prepare(
      'INSERT INTO project_screenshots (project_id, path, thumbnail) VALUES (?, ?, ?)'
    ).run(projectId, `/screenshots/${filename}`, isThumb ? 1 : 0);

    if (isThumb) {
      db.prepare('UPDATE projects SET thumbnail = ? WHERE id = ?').run(`/screenshots/${filename}`, projectId);
    }

    console.log(`✅ Screenshot captured for project ${projectId}: ${filename} (${screenshotBuf.length} bytes)`);
    return `/screenshots/${filename}`;
  } catch (err) {
    console.log(`⚠️  Screenshot failed for project ${projectId}: ${err.message}`);
    return null;
  } finally {
    delete isScreenshotting[projectId];
  }
}

// GET /api/projects/:id/screenshots — list all screenshots for a project
app.get('/api/projects/:id/screenshots', (req, res) => {
  const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ success: false, message: '项目不存在' });

  const screenshots = db.prepare(
    'SELECT * FROM project_screenshots WHERE project_id = ? ORDER BY created_at ASC'
  ).all(req.params.id);

  res.json({ success: true, data: screenshots });
});

// POST /api/projects/:id/screenshot — manual screenshot (save as extra)
app.post('/api/projects/:id/screenshot', async (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ success: false, message: '项目不存在' });

  const count = db.prepare(
    'SELECT COUNT(*) as cnt FROM project_screenshots WHERE project_id = ?'
  ).get(req.params.id);

  if (count.cnt >= 4) {
    return res.json({ success: false, message: '最多支持 4 张截图，请删除后再试' });
  }

  const result = await executeCapture(project.id, project.url);
  if (result) {
    res.json({ success: true, data: { path: result }, message: '截图成功' });
  } else {
    res.json({ success: false, message: '截图失败' });
  }
});

// Open project - returns immediately, auto screenshot ONCE (only if no screenshots exist)
app.get('/api/projects/:id/open', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ success: false, message: '项目不存在' });

  const hasScreenshots = db.prepare(
    'SELECT COUNT(*) as cnt FROM project_screenshots WHERE project_id = ?'
  ).get(req.params.id);

  // Only auto screenshot if project has zero screenshots
  if (hasScreenshots.cnt === 0) {
    setImmediate(() => executeCapture(project.id, project.url));
  }

  res.json({ success: true, data: project });
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/projects', (req, res) => {
  const { category, keyword } = req.query;
  let sql = `
    SELECT p.*,
      COUNT(ps.id) as screenshot_count,
      GROUP_CONCAT(ps.path) as screenshot_paths
    FROM projects p
    LEFT JOIN project_screenshots ps ON p.id = ps.project_id
    WHERE 1=1
  `;
  const params = [];

  if (category && category !== '全部') {
    sql += ' AND p.category = ?';
    params.push(category);
  }
  if (keyword) {
    sql += ' AND (p.name LIKE ? OR p.url LIKE ? OR p.description LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  sql += ' GROUP BY p.id ORDER BY p.updated_at DESC';

  const projects = db.prepare(sql).all(...params);
  res.json({ success: true, data: projects });
});

app.get('/api/projects/:id', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ success: false, message: '项目不存在' });
  res.json({ success: true, data: project });
});

app.post('/api/projects', (req, res) => {
  const { name, url, username, password, description, category } = req.body;
  if (!name || !url) return res.status(400).json({ success: false, message: '名称和URL为必填项' });

  const result = db.prepare(
    'INSERT INTO projects (name, url, username, password, description, category) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name, url, username || '', password || '', description || '', category || '默认');

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
  res.json({ success: true, data: project });
});

app.put('/api/projects/:id', (req, res) => {
  const { name, url, username, password, description, category } = req.body;
  if (!name || !url) return res.status(400).json({ success: false, message: '名称和URL为必填项' });

  db.prepare(
    'UPDATE projects SET name=?, url=?, username=?, password=?, description=?, category=?, updated_at=CURRENT_TIMESTAMP WHERE id=?'
  ).run(name, url, username || '', password || '', description || '', category || '默认', req.params.id);

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  res.json({ success: true, data: project });
});

app.delete('/api/projects/:id', (req, res) => {
  // Cleanup screenshot files from filesystem
  const screenshots = db.prepare('SELECT path FROM project_screenshots WHERE project_id = ?').all(req.params.id);
  screenshots.forEach(s => {
    try { fs.unlinkSync(path.join(__dirname, 'public', s.path)); } catch {}
  });
  // Delete records
  db.prepare('DELETE FROM project_screenshots WHERE project_id = ?').run(req.params.id);
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: '删除成功' });
});

app.get('/api/stats', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as count FROM projects').get().count;
  const categories = db.prepare('SELECT category, COUNT(*) as count FROM projects GROUP BY category').all();
  const recent = db.prepare('SELECT * FROM projects ORDER BY created_at DESC LIMIT 5').all();
  res.json({ success: true, data: { total, categories, recent } });
});

app.get('/api/categories', (req, res) => {
  const categories = db.prepare('SELECT DISTINCT category FROM projects ORDER BY category').all();
  res.json({ success: true, data: categories.map(c => c.category) });
});

app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  🚀 WebHub 运行在 http://localhost:${PORT}\n`);
  // Pre-launch browser pool to avoid first-click delay
  getBrowser().then(() => {
    console.log('  🖥️  截图浏览器已就绪');
  }).catch(err => {
    console.log('  ⚠️  浏览器预启动延迟（将在首次截图时启动）:', err.message);
  });
});

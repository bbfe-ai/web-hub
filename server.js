const express = require('express');
const path = require('path');
const cors = require('cors');
const Database = require('better-sqlite3');
const puppeteer = require('puppeteer');
const multer = require('multer');
const fs = require('fs');
const http = require('http');
const https = require('https');
const { URL } = require('url');

const app = express();
const PORT = process.env.PORT || 3000;

// ============ 团队配置 ============
const DEFAULT_TEAM_CONFIG = {
  teamName: '我的团队',
  welcomeMessage: '团队工具墙',
  showWhoAdded: true,
  compactViewByDefault: false,
  newThresholdDays: 7,
  healthCheckIntervalHours: 24,
  screenshotRefreshIntervalDays: 7
};
function loadTeamConfig() {
  try {
    const p = path.join(__dirname, 'config', 'team.json');
    if (fs.existsSync(p)) {
      const raw = JSON.parse(fs.readFileSync(p, 'utf-8'));
      return { ...DEFAULT_TEAM_CONFIG, ...raw };
    }
  } catch (e) { console.log('⚠️  team.json 读取失败:', e.message); }
  return DEFAULT_TEAM_CONFIG;
}
let teamConfig = loadTeamConfig();

const db = new Database(path.join(__dirname, 'data', 'webhub.db'));
db.exec(`PRAGMA foreign_keys = ON`);

// ============ schema 与迁移 ============
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
    click_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

function addColumnIfMissing(table, column, definition) {
  try {
    db.prepare(`SELECT ${column} FROM ${table} LIMIT 1`).get();
  } catch {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`✓ 迁移：已为 ${table} 添加列 ${column}`);
  }
}
addColumnIfMissing('projects', 'click_count', 'INTEGER DEFAULT 0');
addColumnIfMissing('projects', 'created_by', "TEXT DEFAULT ''");
addColumnIfMissing('projects', 'updated_by', "TEXT DEFAULT ''");
addColumnIfMissing('projects', 'tips', "TEXT DEFAULT ''");
addColumnIfMissing('projects', 'favicon', "TEXT DEFAULT ''");
addColumnIfMissing('projects', 'health_status', "TEXT DEFAULT 'unknown'");
addColumnIfMissing('projects', 'last_checked_at', 'DATETIME');
addColumnIfMissing('projects', 'last_screenshot_at', 'DATETIME');

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

db.exec(`
  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
  );
  CREATE TABLE IF NOT EXISTS project_tags (
    project_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (project_id, tag_id),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS click_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    user_name TEXT DEFAULT '',
    clicked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_click_events_time ON click_events(clicked_at);
  CREATE INDEX IF NOT EXISTS idx_click_events_proj ON click_events(project_id);
`);

// 把旧版 thumbnail 字段迁移到 project_screenshots
const oldThumbnails = db.prepare("SELECT id, thumbnail FROM projects WHERE thumbnail != ''").all();
for (const p of oldThumbnails) {
  const existing = db.prepare(
    "SELECT COUNT(*) as cnt FROM project_screenshots WHERE project_id = ? AND path = ?"
  ).get(p.id, p.thumbnail);
  if (existing.cnt === 0) {
    db.prepare('INSERT INTO project_screenshots (project_id, path, thumbnail) VALUES (?, ?, 1)').run(p.id, p.thumbnail);
  }
}

// ============ 目录准备 ============
const dataDir = path.join(__dirname, 'data');
const screenshotsDir = path.join(dataDir, 'screenshots');
const logsDir = path.join(dataDir, 'logs');
for (const dir of [screenshotsDir, logsDir]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ============ 浏览器池 ============
let browserPool = null;
let isScreenshotting = {};

function writeLog(level, projectId, url, message, error = '') {
  const logFile = path.join(logsDir, `screenshot-${new Date().toISOString().slice(0, 10)}.log`);
  const line = `[${new Date().toISOString()}] [${level}] project=${projectId} url=${url} ${message}${error ? ' error=' + error : ''}\n`;
  try { fs.appendFileSync(logFile, line); } catch {}
}

async function getBrowser() {
  if (browserPool) {
    try {
      const pages = await browserPool.pages();
      if (pages.length > 0) {
        await Promise.race([
          pages[0].title(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Browser unresponsive')), 2000))
        ]);
        return browserPool;
      }
    } catch {
      try { await browserPool.close(); } catch {}
      browserPool = null;
    }
  }
  browserPool = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });
  return browserPool;
}

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
        page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 }),
        new Promise(resolve => setTimeout(resolve, 15000))
      ]);
    } catch (navErr) {
      writeLog('WARN', projectId, url, 'Navigation timeout, continuing');
    }
    await new Promise(resolve => setTimeout(resolve, 2000));

    const screenshotBuf = await page.screenshot({ type: 'png' });
    await page.close();

    if (!screenshotBuf || screenshotBuf.length < 1000) {
      writeLog('FAIL', projectId, url, 'Screenshot too small');
      delete isScreenshotting[projectId];
      return null;
    }
    fs.writeFileSync(filepath, screenshotBuf);
    if (!fs.existsSync(filepath) || fs.statSync(filepath).size < 1000) {
      delete isScreenshotting[projectId];
      return null;
    }

    const existing = db.prepare('SELECT COUNT(*) as cnt FROM project_screenshots WHERE project_id = ?').get(projectId);
    const isThumb = existing.cnt === 0;
    const publicPath = `/screenshots/${filename}`;
    db.prepare('INSERT INTO project_screenshots (project_id, path, thumbnail) VALUES (?, ?, ?)')
      .run(projectId, publicPath, isThumb ? 1 : 0);
    if (isThumb) {
      db.prepare('UPDATE projects SET thumbnail = ? WHERE id = ?').run(publicPath, projectId);
    }
    db.prepare('UPDATE projects SET last_screenshot_at = CURRENT_TIMESTAMP WHERE id = ?').run(projectId);
    return publicPath;
  } catch (err) {
    writeLog('FAIL', projectId, url, 'Screenshot error', err.message);
    return null;
  } finally {
    delete isScreenshotting[projectId];
  }
}

// ============ favicon 抓取 ============
function fetchUrlContent(targetUrl, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    let parsedUrl;
    try { parsedUrl = new URL(targetUrl); } catch (e) { return reject(e); }
    const lib = parsedUrl.protocol === 'https:' ? https : http;
    const req = lib.get(targetUrl, {
      timeout: timeoutMs,
      rejectUnauthorized: false,
      headers: { 'User-Agent': 'WebHub/1.0 (+webhub)' }
    }, res => {
      // 跟随一次重定向
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = new URL(res.headers.location, targetUrl).toString();
        res.resume();
        return fetchUrlContent(redirectUrl, timeoutMs).then(resolve, reject);
      }
      let body = '';
      let bytes = 0;
      res.setEncoding('utf-8');
      res.on('data', chunk => {
        bytes += chunk.length;
        if (bytes < 256 * 1024) body += chunk;
      });
      res.on('end', () => resolve({ status: res.statusCode || 0, body, headers: res.headers }));
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
  });
}

async function probeUrl(targetUrl, timeoutMs = 6000) {
  return new Promise((resolve) => {
    let parsedUrl;
    try { parsedUrl = new URL(targetUrl); } catch { return resolve({ ok: false, status: 0 }); }
    const lib = parsedUrl.protocol === 'https:' ? https : http;
    const req = lib.request(targetUrl, {
      method: 'HEAD',
      timeout: timeoutMs,
      rejectUnauthorized: false,
      headers: { 'User-Agent': 'WebHub/1.0 (+healthcheck)' }
    }, res => {
      resolve({ ok: res.statusCode > 0 && res.statusCode < 500, status: res.statusCode });
    });
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, status: 0 }); });
    req.on('error', () => resolve({ ok: false, status: 0 }));
    req.end();
  });
}

async function extractMetadata(targetUrl) {
  try {
    const { body } = await fetchUrlContent(targetUrl, 8000);
    const titleMatch = body.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim().slice(0, 100) : '';
    let iconMatch = body.match(/<link[^>]+rel=["']?(?:shortcut\s+)?icon["']?[^>]*href=["']([^"']+)["']/i);
    if (!iconMatch) {
      iconMatch = body.match(/<link[^>]+href=["']([^"']+)["'][^>]*rel=["']?(?:shortcut\s+)?icon/i);
    }
    let favicon = '';
    if (iconMatch) {
      try { favicon = new URL(iconMatch[1], targetUrl).toString(); } catch {}
    }
    if (!favicon) {
      try {
        const origin = new URL(targetUrl).origin;
        const guess = origin + '/favicon.ico';
        const probed = await probeUrl(guess, 3000);
        if (probed.ok) favicon = guess;
      } catch {}
    }
    let description = '';
    const descMatch = body.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                      body.match(/<meta[^>]+content=["']([^"']+)["'][^>]*name=["']description["']/i);
    if (descMatch) description = descMatch[1].trim().slice(0, 200);
    return { title, favicon, description };
  } catch {
    try {
      const origin = new URL(targetUrl).origin;
      const probed = await probeUrl(origin + '/favicon.ico', 3000);
      return { title: '', favicon: probed.ok ? origin + '/favicon.ico' : '', description: '' };
    } catch {
      return { title: '', favicon: '', description: '' };
    }
  }
}

// ============ 标签辅助 ============
function setProjectTags(projectId, tags) {
  db.prepare('DELETE FROM project_tags WHERE project_id = ?').run(projectId);
  if (!Array.isArray(tags)) return;
  const insertTag = db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)');
  const findTag = db.prepare('SELECT id FROM tags WHERE name = ?');
  const linkTag = db.prepare('INSERT OR IGNORE INTO project_tags (project_id, tag_id) VALUES (?, ?)');
  for (const raw of tags) {
    const name = String(raw || '').trim().slice(0, 32);
    if (!name) continue;
    insertTag.run(name);
    const row = findTag.get(name);
    if (row) linkTag.run(projectId, row.id);
  }
}

function getProjectTags(projectId) {
  return db.prepare(`
    SELECT t.name FROM tags t
    INNER JOIN project_tags pt ON pt.tag_id = t.id
    WHERE pt.project_id = ?
    ORDER BY t.name
  `).all(projectId).map(r => r.name);
}

function attachTagsToProjects(rows) {
  if (!rows || rows.length === 0) return rows;
  const ids = rows.map(r => r.id);
  const placeholders = ids.map(() => '?').join(',');
  const tagRows = db.prepare(`
    SELECT pt.project_id, t.name FROM project_tags pt
    JOIN tags t ON t.id = pt.tag_id
    WHERE pt.project_id IN (${placeholders})
    ORDER BY t.name
  `).all(...ids);
  const tagMap = {};
  for (const r of tagRows) {
    (tagMap[r.project_id] = tagMap[r.project_id] || []).push(r.name);
  }
  for (const r of rows) r.tags = tagMap[r.id] || [];
  return rows;
}

// ============ 中间件 ============
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/screenshots/:filename', (req, res) => {
  const filePath = path.join(screenshotsDir, req.params.filename);
  res.sendFile(filePath, (err) => {
    if (err) res.status(404).json({ success: false, message: '截图不存在' });
  });
});

// ============ 团队配置 API ============
app.get('/api/team', (req, res) => {
  const totalProjects = db.prepare('SELECT COUNT(*) as cnt FROM projects').get().cnt;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayClicks = db.prepare("SELECT COUNT(*) as cnt FROM click_events WHERE clicked_at >= ?").get(today.toISOString()).cnt;
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const weekClicks = db.prepare("SELECT COUNT(*) as cnt FROM click_events WHERE clicked_at >= ?").get(weekAgo.toISOString()).cnt;
  res.json({ success: true, data: { ...teamConfig, totalProjects, todayClicks, weekClicks } });
});

// ============ 项目列表 ============
app.get('/api/projects', (req, res) => {
  const { category, keyword, tag } = req.query;
  let sql = `
    SELECT p.*,
      COUNT(DISTINCT ps.id) as screenshot_count,
      GROUP_CONCAT(DISTINCT ps.path) as screenshot_paths
    FROM projects p
    LEFT JOIN project_screenshots ps ON p.id = ps.project_id
  `;
  const where = [];
  const params = [];
  if (category && category !== '全部') { where.push('p.category = ?'); params.push(category); }
  if (tag) {
    sql += ' INNER JOIN project_tags pt ON pt.project_id = p.id INNER JOIN tags t ON t.id = pt.tag_id';
    where.push('t.name = ?'); params.push(tag);
  }
  if (keyword) {
    where.push('(p.name LIKE ? OR p.url LIKE ? OR p.description LIKE ? OR p.tips LIKE ?)');
    const kw = `%${keyword}%`;
    params.push(kw, kw, kw, kw);
  }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' GROUP BY p.id ORDER BY p.updated_at DESC';

  const projects = db.prepare(sql).all(...params);
  attachTagsToProjects(projects);
  res.json({ success: true, data: projects });
});

app.get('/api/projects/hot', (req, res) => {
  const limit = parseInt(req.query.limit) || 3;
  const since = new Date(); since.setDate(since.getDate() - 30);
  const rows = db.prepare(`
    SELECT p.*,
      COUNT(DISTINCT ps.id) as screenshot_count,
      GROUP_CONCAT(DISTINCT ps.path) as screenshot_paths,
      (SELECT COUNT(*) FROM click_events ce WHERE ce.project_id = p.id AND ce.clicked_at >= ?) as recent_clicks
    FROM projects p
    LEFT JOIN project_screenshots ps ON p.id = ps.project_id
    GROUP BY p.id
    ORDER BY recent_clicks DESC, p.click_count DESC, p.updated_at DESC
    LIMIT ?
  `).all(since.toISOString(), limit);
  attachTagsToProjects(rows);
  res.json({ success: true, data: rows.filter(r => (r.recent_clicks || 0) + (r.click_count || 0) > 0) });
});

app.get('/api/projects/recent-activity', (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const rows = db.prepare(`
    SELECT p.id, p.name, p.url, p.thumbnail, p.favicon, ce.user_name, ce.clicked_at
    FROM click_events ce
    JOIN projects p ON p.id = ce.project_id
    ORDER BY ce.clicked_at DESC
    LIMIT ?
  `).all(limit);
  res.json({ success: true, data: rows });
});

app.get('/api/projects/:id', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ success: false, message: '项目不存在' });
  project.tags = getProjectTags(project.id);
  res.json({ success: true, data: project });
});

app.post('/api/projects', async (req, res) => {
  const { name, url, username, password, description, category, tips, tags, user_name, fetch_metadata } = req.body;
  if (!name || !url) return res.status(400).json({ success: false, message: '名称和URL为必填项' });

  let finalName = name;
  let finalDesc = description || '';
  let favicon = '';

  if (fetch_metadata) {
    try {
      const meta = await extractMetadata(url);
      if (meta.favicon) favicon = meta.favicon;
      if (!finalName || finalName === url) finalName = meta.title || finalName;
      if (!finalDesc && meta.description) finalDesc = meta.description;
    } catch {}
  }

  const result = db.prepare(
    `INSERT INTO projects (name, url, username, password, description, category, tips, favicon, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(finalName, url, username || '', password || '', finalDesc, category || '默认',
        tips || '', favicon, user_name || '', user_name || '');

  const projectId = result.lastInsertRowid;
  if (Array.isArray(tags)) setProjectTags(projectId, tags);

  if (!favicon) {
    setImmediate(async () => {
      try {
        const meta = await extractMetadata(url);
        if (meta.favicon) {
          db.prepare('UPDATE projects SET favicon = ? WHERE id = ?').run(meta.favicon, projectId);
        }
      } catch {}
    });
  }

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  project.tags = getProjectTags(projectId);
  res.json({ success: true, data: project });
});

app.post('/api/projects/batch', async (req, res) => {
  const { urls, category, user_name } = req.body;
  if (!Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ success: false, message: 'URL 列表不能为空' });
  }
  const results = [];
  const insertStmt = db.prepare(
    `INSERT INTO projects (name, url, description, category, favicon, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  await Promise.all(urls.slice(0, 50).map(async (rawUrl) => {
    const u = String(rawUrl || '').trim();
    if (!u || !/^https?:\/\//i.test(u)) {
      results.push({ url: u, success: false, message: '无效 URL' });
      return;
    }
    const existing = db.prepare('SELECT id FROM projects WHERE url = ?').get(u);
    if (existing) {
      results.push({ url: u, success: false, message: '已存在', id: existing.id });
      return;
    }
    let name = '';
    let desc = '';
    let favicon = '';
    try {
      const meta = await extractMetadata(u);
      name = meta.title || '';
      desc = meta.description || '';
      favicon = meta.favicon || '';
    } catch {}
    if (!name) {
      try { name = new URL(u).hostname.replace(/^www\./, ''); } catch { name = u; }
    }
    try {
      const r = insertStmt.run(name, u, desc, category || '默认', favicon, user_name || '', user_name || '');
      results.push({ url: u, success: true, id: r.lastInsertRowid, name });
    } catch (e) {
      results.push({ url: u, success: false, message: e.message });
    }
  }));

  res.json({ success: true, data: results });
});

app.put('/api/projects/:id', (req, res) => {
  const { name, url, username, password, description, category, tips, tags, user_name } = req.body;
  if (!name || !url) return res.status(400).json({ success: false, message: '名称和URL为必填项' });

  db.prepare(
    `UPDATE projects SET name=?, url=?, username=?, password=?, description=?, category=?,
     tips=?, updated_by=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`
  ).run(name, url, username || '', password || '', description || '', category || '默认',
        tips || '', user_name || '', req.params.id);

  if (Array.isArray(tags)) setProjectTags(req.params.id, tags);

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  project.tags = getProjectTags(project.id);
  res.json({ success: true, data: project });
});

app.delete('/api/projects/:id', (req, res) => {
  const screenshots = db.prepare('SELECT path FROM project_screenshots WHERE project_id = ?').all(req.params.id);
  screenshots.forEach(s => {
    try { fs.unlinkSync(path.join(screenshotsDir, s.path.replace('/screenshots/', ''))); } catch {}
  });
  db.prepare('DELETE FROM project_screenshots WHERE project_id = ?').run(req.params.id);
  db.prepare('DELETE FROM project_tags WHERE project_id = ?').run(req.params.id);
  db.prepare('DELETE FROM click_events WHERE project_id = ?').run(req.params.id);
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: '删除成功' });
});

// ============ 点击 / 计数 ============
app.get('/api/projects/:id/open', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ success: false, message: '项目不存在' });

  const userName = String(req.query.user || '').slice(0, 32);
  db.prepare('UPDATE projects SET click_count = click_count + 1 WHERE id = ?').run(req.params.id);
  db.prepare('INSERT INTO click_events (project_id, user_name) VALUES (?, ?)').run(req.params.id, userName);

  const hasScreenshots = db.prepare(
    'SELECT COUNT(*) as cnt FROM project_screenshots WHERE project_id = ?'
  ).get(req.params.id);
  if (hasScreenshots.cnt === 0) {
    setImmediate(() => executeCapture(project.id, project.url));
  }

  const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  updated.tags = getProjectTags(updated.id);
  res.json({ success: true, data: updated });
});

// ============ 标签 ============
app.get('/api/tags', (req, res) => {
  const rows = db.prepare(`
    SELECT t.name, COUNT(pt.project_id) as count
    FROM tags t LEFT JOIN project_tags pt ON pt.tag_id = t.id
    GROUP BY t.id ORDER BY count DESC, t.name
  `).all();
  res.json({ success: true, data: rows });
});

// ============ 截图相关（沿用现有逻辑）============
app.get('/api/projects/:id/screenshots', (req, res) => {
  const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ success: false, message: '项目不存在' });
  const screenshots = db.prepare(
    'SELECT * FROM project_screenshots WHERE project_id = ? ORDER BY created_at ASC'
  ).all(req.params.id);
  res.json({ success: true, data: screenshots });
});

app.delete('/api/projects/:id/screenshot/:screenshotId', (req, res) => {
  const screenshot = db.prepare(
    'SELECT * FROM project_screenshots WHERE id = ? AND project_id = ?'
  ).get(req.params.screenshotId, req.params.id);
  if (!screenshot) return res.status(404).json({ success: false, message: '截图不存在' });

  try { fs.unlinkSync(path.join(screenshotsDir, screenshot.path.replace('/screenshots/', ''))); } catch {}
  db.prepare('DELETE FROM project_screenshots WHERE id = ?').run(screenshot.id);

  if (screenshot.thumbnail) {
    const next = db.prepare(
      'SELECT * FROM project_screenshots WHERE project_id = ? ORDER BY created_at ASC LIMIT 1'
    ).get(req.params.id);
    if (next) {
      db.prepare('UPDATE project_screenshots SET thumbnail = 1 WHERE id = ?').run(next.id);
      db.prepare('UPDATE projects SET thumbnail = ? WHERE id = ?').run(next.path, req.params.id);
    } else {
      db.prepare("UPDATE projects SET thumbnail = '' WHERE id = ?").run(req.params.id);
    }
  }
  res.json({ success: true, message: '截图已删除' });
});

app.post('/api/projects/:id/screenshot', async (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ success: false, message: '项目不存在' });
  const count = db.prepare('SELECT COUNT(*) as cnt FROM project_screenshots WHERE project_id = ?').get(req.params.id);
  if (count.cnt >= 4) return res.json({ success: false, message: '最多支持 4 张截图，请删除后再试' });
  try {
    const result = await executeCapture(project.id, project.url);
    if (result) res.json({ success: true, data: { path: result }, message: '截图成功' });
    else res.json({ success: false, message: '截图失败' });
  } catch (err) {
    res.json({ success: false, message: '截图失败: ' + err.message });
  }
});

const upload = multer({ dest: screenshotsDir });
app.post('/api/projects/:id/screenshot-upload', upload.single('screenshot'), (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ success: false, message: '项目不存在' });
  const count = db.prepare('SELECT COUNT(*) as cnt FROM project_screenshots WHERE project_id = ?').get(req.params.id);
  if (count.cnt >= 4) {
    try { fs.unlinkSync(req.file.path); } catch {}
    return res.json({ success: false, message: '最多支持 4 张截图，请删除后再试' });
  }
  if (!req.file) return res.json({ success: false, message: '未接收到图片文件' });

  const timestamp = Date.now();
  const ext = path.extname(req.file.originalname) || '.png';
  const filename = `project-${req.params.id}-${timestamp}${ext}`;
  const filepath = path.join(screenshotsDir, filename);
  try { fs.renameSync(req.file.path, filepath); } catch {
    try { fs.unlinkSync(req.file.path); } catch {}
    return res.json({ success: false, message: '文件保存失败' });
  }
  const existing = db.prepare('SELECT COUNT(*) as cnt FROM project_screenshots WHERE project_id = ?').get(req.params.id);
  const isThumb = existing.cnt === 0;
  const publicPath = `/screenshots/${filename}`;
  db.prepare('INSERT INTO project_screenshots (project_id, path, thumbnail) VALUES (?, ?, ?)')
    .run(req.params.id, publicPath, isThumb ? 1 : 0);
  if (isThumb) db.prepare('UPDATE projects SET thumbnail = ? WHERE id = ?').run(publicPath, req.params.id);
  res.json({ success: true, data: { path: publicPath }, message: '截图上传成功' });
});

// ============ 统计 / 分类 ============
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

// ============ 元数据预览（前端批量添加用）============
app.post('/api/metadata', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.json({ success: false, message: 'URL 必填' });
  try {
    const meta = await extractMetadata(url);
    res.json({ success: true, data: meta });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

// ============ 健康检查 ============
async function runHealthChecks() {
  const projects = db.prepare('SELECT id, url FROM projects').all();
  console.log(`🔍 健康检查：开始扫描 ${projects.length} 个项目`);
  let ok = 0, fail = 0;
  for (const p of projects) {
    const r = await probeUrl(p.url, 6000);
    const status = r.ok ? 'online' : 'offline';
    db.prepare('UPDATE projects SET health_status = ?, last_checked_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(status, p.id);
    r.ok ? ok++ : fail++;
  }
  console.log(`🔍 健康检查完成：${ok} 在线，${fail} 不可达`);
}

app.post('/api/health-check', async (req, res) => {
  const id = req.body && req.body.id;
  if (id) {
    const p = db.prepare('SELECT url FROM projects WHERE id = ?').get(id);
    if (!p) return res.status(404).json({ success: false, message: '项目不存在' });
    const r = await probeUrl(p.url, 6000);
    const status = r.ok ? 'online' : 'offline';
    db.prepare('UPDATE projects SET health_status = ?, last_checked_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(status, id);
    return res.json({ success: true, data: { status, http: r.status } });
  }
  runHealthChecks().catch(e => console.log('health check error', e.message));
  res.json({ success: true, message: '已在后台开始检查' });
});

// ============ 单页 ============
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============ 启动 ============
app.listen(PORT, () => {
  console.log(`\n  🚀 WebHub 运行在 http://localhost:${PORT}\n`);
  console.log(`  👥 团队：${teamConfig.teamName}`);

  getBrowser().then(() => console.log('  🖥️  截图浏览器已就绪'))
    .catch(err => console.log('  ⚠️  浏览器预启动延迟：', err.message));

  const healthIntervalMs = (teamConfig.healthCheckIntervalHours || 24) * 3600 * 1000;
  setTimeout(() => {
    runHealthChecks().catch(e => console.log('health check error', e.message));
    setInterval(() => {
      runHealthChecks().catch(e => console.log('health check error', e.message));
    }, healthIntervalMs);
  }, 30 * 1000);

  const screenshotIntervalMs = (teamConfig.screenshotRefreshIntervalDays || 7) * 24 * 3600 * 1000;
  setInterval(async () => {
    const since = new Date(Date.now() - screenshotIntervalMs).toISOString();
    const stale = db.prepare(`
      SELECT p.id, p.url FROM projects p
      WHERE (p.last_screenshot_at IS NULL OR p.last_screenshot_at < ?)
        AND (SELECT COUNT(*) FROM project_screenshots WHERE project_id = p.id) < 4
      LIMIT 5
    `).all(since);
    for (const p of stale) {
      await executeCapture(p.id, p.url);
    }
  }, 3600 * 1000);
});

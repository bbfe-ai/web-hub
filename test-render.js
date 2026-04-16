const db = require('better-sqlite3')('data/webhub.db');
const projects = db.prepare(`
  SELECT p.*, COUNT(ps.id) as screenshot_count, GROUP_CONCAT(ps.path) as screenshot_paths
  FROM projects p LEFT JOIN project_screenshots ps ON p.id = ps.project_id
  GROUP BY p.id ORDER BY p.updated_at DESC
`).all();

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

for (const p of projects) {
  const count = p.screenshot_count || 0;
  const paths = p.screenshot_paths ? p.screenshot_paths.split(',') : [];
  console.log('--- Project:', p.name, 'count:', count, 'paths:', paths.length);

  if (count === 0) {
    console.log('  RENDER: placeholder');
  } else if (count === 1) {
    console.log('  RENDER: single img src=' + escapeHtml(paths[0] || p.thumbnail));
  } else {
    console.log('  RENDER: grid with', paths.slice(0,4).length, 'images');
    paths.slice(0,4).forEach((s,i) => console.log('    img[' + i + '] src=' + escapeHtml(s)));
  }
}
db.close();

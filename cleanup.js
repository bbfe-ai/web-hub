const db = require('better-sqlite3')('data/webhub.db');
const fs = require('fs');
const path = require('path');

db.prepare('DELETE FROM project_screenshots').run();
console.log('Cleared screenshot records');

db.prepare("UPDATE projects SET thumbnail = ''").run();
console.log('Reset thumbnails');

const dir = 'public/screenshots';
if (fs.existsSync(dir)) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    fs.unlinkSync(path.join(dir, f));
    console.log('Deleted:', f);
  }
}

db.close();

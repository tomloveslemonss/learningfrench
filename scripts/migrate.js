const fs = require('fs');
const path = require('path');
const { openDb, run, all } = require('../db');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

async function migrate() {
  fs.mkdirSync(path.join(__dirname, '..', 'data'), { recursive: true });
  const db = openDb();
  await run(
    db,
    'CREATE TABLE IF NOT EXISTS migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, run_at TEXT NOT NULL)'
  );
  const applied = await all(db, 'SELECT name FROM migrations');
  const appliedNames = new Set(applied.map((row) => row.name));
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (appliedNames.has(file)) {
      continue;
    }
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    await run(db, 'BEGIN');
    try {
      await run(db, sql);
      await run(db, 'INSERT INTO migrations (name, run_at) VALUES (?, datetime("now"))', [file]);
      await run(db, 'COMMIT');
      console.log(`Applied migration: ${file}`);
    } catch (error) {
      await run(db, 'ROLLBACK');
      console.error(`Failed migration: ${file}`);
      throw error;
    }
  }
  db.close();
}

migrate().catch((error) => {
  console.error(error);
  process.exit(1);
});

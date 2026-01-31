const path = require('path');
const { execSync } = require('child_process');

process.env.DB_PATH = path.join(__dirname, '..', 'data', 'test.db');

beforeAll(() => {
  execSync('node scripts/migrate.js', {
    env: { ...process.env, DB_PATH: process.env.DB_PATH },
    stdio: 'inherit'
  });
});

afterAll(() => {
  execSync(`rm -f ${process.env.DB_PATH}`);
});

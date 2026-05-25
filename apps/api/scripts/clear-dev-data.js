/**
 * Clear customers, transactions, and related rows. Keeps users, tiers, and channel config.
 * Usage: SKIP_DEMO_SEED=1 pnpm --filter @loyalty/api run db:clear
 */
const { execSync } = require('child_process');
const { join } = require('path');
const { readFileSync } = require('fs');

const API_ROOT = join(__dirname, '..');
const SQL_FILE = join(API_ROOT, 'prisma', 'scripts', 'clear-dev-data.sql');

if (!process.env.DATABASE_URL) {
  console.error('[clear-dev-data] DATABASE_URL is required');
  process.exit(1);
}

const sql = readFileSync(SQL_FILE, 'utf8');
console.log('[clear-dev-data] clearing operational data…');

execSync('npx prisma db execute --stdin', {
  cwd: API_ROOT,
  stdio: ['pipe', 'inherit', 'inherit'],
  env: process.env,
  input: sql,
});

console.log('[clear-dev-data] done. Set SKIP_DEMO_SEED=1 on dev Backend to prevent demo re-seed on restart.');

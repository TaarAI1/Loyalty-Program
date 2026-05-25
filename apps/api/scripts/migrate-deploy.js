/**
 * Production migration deploy with self-heal (Railway / prisma migrate deploy).
 * Uses only the Prisma CLI — no @prisma/client required at startup.
 */
const { execSync } = require('child_process');
const { join } = require('path');

const API_ROOT = join(__dirname, '..');
const LOG = '[rewardly-migrate]';
const FAILED_MIGRATION = '20260515000001_add_loyalty_best_practices';
const INIT_SQL = 'prisma/migrations/20260514000001_init/migration.sql';

function log(msg) {
  console.log(`${LOG} ${msg}`);
}

function run(args, { ignoreError = false } = {}) {
  const cmd = `npx prisma ${args}`;
  log(`> ${cmd}`);
  try {
    execSync(cmd, { cwd: API_ROOT, stdio: 'inherit', env: process.env });
    return true;
  } catch (err) {
    if (!ignoreError) throw err;
    log(`(skipped) ${args}`);
    return false;
  }
}

/** Returns true when loyalty_tiers is missing or unreachable. */
function loyaltyTiersMissing() {
  try {
    execSync('npx prisma db execute --stdin', {
      cwd: API_ROOT,
      env: process.env,
      input: 'SELECT 1 FROM "loyalty_tiers" LIMIT 1;',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return false;
  } catch {
    return true;
  }
}

function main() {
  log(`starting (cwd=${process.cwd()}, apiRoot=${API_ROOT})`);

  // Must clear failed migration before deploy will run (P3009).
  run(`migrate resolve --rolled-back ${FAILED_MIGRATION}`, { ignoreError: true });

  if (loyaltyTiersMissing()) {
    log('loyalty_tiers missing — applying init migration SQL');
    run(`db execute --file ${INIT_SQL}`);
  } else {
    log('loyalty_tiers present — skipping init SQL');
  }

  log('running migrate deploy');
  run('migrate deploy');
  log('done');
}

try {
  main();
} catch (err) {
  console.error(`${LOG} FAILED:`, err.message || err);
  process.exit(1);
}

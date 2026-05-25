/**
 * Runs during `npm run build` when DATABASE_URL is set (Railway build).
 * Clears failed Prisma migration rows and syncs schema via db push
 * (does not use migrate deploy — avoids P3008/P3009).
 */
const { execSync } = require('child_process');
const { join } = require('path');

const LOG = '[rewardly-heal-db]';
const API_ROOT = join(__dirname, '..');
const FAILED = '20260515000001_add_loyalty_best_practices';

function log(msg) {
  console.log(`${LOG} ${msg}`);
}

function run(args, { ignore = false, input } = {}) {
  const cmd = `npx prisma ${args}`;
  log(`> ${cmd}`);
  try {
    execSync(cmd, {
      cwd: API_ROOT,
      stdio: input ? ['pipe', 'inherit', 'inherit'] : 'inherit',
      env: process.env,
      input,
    });
  } catch (err) {
    if (ignore) {
      log(`(ignored) ${args}`);
      return;
    }
    throw err;
  }
}

if (!process.env.DATABASE_URL) {
  log('no DATABASE_URL — skip (local build)');
  process.exit(0);
}

log('healing database before build continues...');

run('db execute --stdin', {
  ignore: true,
  input: `
DELETE FROM "_prisma_migrations"
WHERE migration_name = '${FAILED}' AND finished_at IS NULL;
`,
});

run('db execute --stdin', {
  ignore: true,
  input: `
DELETE FROM "_prisma_migrations"
WHERE migration_name = '20260514000001_init'
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'loyalty_tiers'
  );
`,
});

run('db push --accept-data-loss --skip-generate');
log('done');

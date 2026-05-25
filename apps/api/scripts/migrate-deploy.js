/**
 * Manual / CI entry. Production runs src/run-migrations.ts from main.ts on boot.
 */
const { execSync } = require('child_process');
const { join } = require('path');

const FAILED_MIGRATION = '20260515000001_add_loyalty_best_practices';
const INIT_SQL = 'prisma/migrations/20260514000001_init/migration.sql';
const LOG = '[rewardly-migrate]';
const API_ROOT = join(__dirname, '..');

function log(msg) {
  console.log(`${LOG} ${msg}`);
}

function run(args, { ignoreError = false, input } = {}) {
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
    if (!ignoreError) throw err;
    log(`(skipped) ${args}`);
  }
}

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

function clearFailedMigrationSql() {
  run('db execute --stdin', {
    ignoreError: true,
    input: `
UPDATE "_prisma_migrations"
SET rolled_back_at = CURRENT_TIMESTAMP
WHERE migration_name = '${FAILED_MIGRATION}'
  AND finished_at IS NULL
  AND rolled_back_at IS NULL;
`,
  });
}

log(`manual run (apiRoot=${API_ROOT})`);
clearFailedMigrationSql();
run(`migrate resolve --rolled-back ${FAILED_MIGRATION}`, { ignoreError: true });
if (loyaltyTiersMissing()) {
  log('loyalty_tiers missing — applying init SQL');
  run(`db execute --file ${INIT_SQL}`);
}
run('migrate deploy');
log('done');

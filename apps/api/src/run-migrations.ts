import { execSync } from 'child_process';
import { join } from 'path';

const FAILED_MIGRATION = '20260515000001_add_loyalty_best_practices';
const INIT_SQL = 'prisma/migrations/20260514000001_init/migration.sql';
const LOG = '[rewardly-migrate]';

function getApiRoot(): string {
  return join(__dirname, '..');
}

function log(msg: string): void {
  console.log(`${LOG} ${msg}`);
}

function runPrisma(args: string, options?: { ignoreError?: boolean; input?: string }): void {
  const cmd = `npx prisma ${args}`;
  log(`> ${cmd}`);
  try {
    execSync(cmd, {
      cwd: getApiRoot(),
      stdio: options?.input ? ['pipe', 'inherit', 'inherit'] : 'inherit',
      env: process.env,
      input: options?.input,
    });
  } catch (err) {
    if (!options?.ignoreError) throw err;
    log(`(skipped) ${args}`);
  }
}

function loyaltyTiersMissing(): boolean {
  try {
    execSync('npx prisma db execute --stdin', {
      cwd: getApiRoot(),
      env: process.env,
      input: 'SELECT 1 FROM "loyalty_tiers" LIMIT 1;',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return false;
  } catch {
    return true;
  }
}

function healMigrationTable(): void {
  const sql = `
DELETE FROM "_prisma_migrations"
WHERE migration_name = '${FAILED_MIGRATION}' AND finished_at IS NULL;

DELETE FROM "_prisma_migrations"
WHERE migration_name = '20260514000001_init'
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'loyalty_tiers'
  );
`;
  runPrisma('db execute --stdin', { ignoreError: true, input: sql });
}

/**
 * Production schema sync — never uses `prisma migrate deploy` (avoids P3008/P3009).
 */
export function runMigrationsBeforeBoot(): void {
  if (process.env.SKIP_DB_MIGRATE === '1') {
    log('SKIP_DB_MIGRATE=1 — skipping');
    return;
  }

  log(`heal starting (apiRoot=${getApiRoot()}, cwd=${process.cwd()})`);

  healMigrationTable();

  if (loyaltyTiersMissing()) {
    log('loyalty_tiers missing — applying init SQL');
    runPrisma(`db execute --file ${INIT_SQL}`);
  }

  log('db push (schema sync)');
  runPrisma('db push --accept-data-loss --skip-generate');
  log('done');
}

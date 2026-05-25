import { execSync } from 'child_process';
import { join } from 'path';

const FAILED_MIGRATION = '20260515000001_add_loyalty_best_practices';
const INIT_SQL = 'prisma/migrations/20260514000001_init/migration.sql';
const LOG = '[rewardly-migrate]';

/** apps/api root (parent of dist/) */
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

/** Clear P3009 failed migration via SQL (works when CLI resolve is not invoked). */
function clearFailedMigrationSql(): void {
  const sql = `
UPDATE "_prisma_migrations"
SET rolled_back_at = CURRENT_TIMESTAMP
WHERE migration_name = '${FAILED_MIGRATION}'
  AND finished_at IS NULL
  AND rolled_back_at IS NULL;
`;
  runPrisma('db execute --stdin', { ignoreError: true, input: sql });
}

/**
 * Heal baselined-then-empty DBs and apply pending migrations.
 * Called from main.ts before Nest boots so Railway only needs: node dist/main
 */
export function runMigrationsBeforeBoot(): void {
  if (process.env.SKIP_DB_MIGRATE === '1') {
    log('SKIP_DB_MIGRATE=1 — skipping');
    return;
  }

  log(`bootstrap heal starting (apiRoot=${getApiRoot()}, cwd=${process.cwd()})`);

  clearFailedMigrationSql();
  runPrisma(`migrate resolve --rolled-back ${FAILED_MIGRATION}`, { ignoreError: true });

  if (loyaltyTiersMissing()) {
    log('loyalty_tiers missing — applying init SQL');
    runPrisma(`db execute --file ${INIT_SQL}`);
  } else {
    log('loyalty_tiers OK');
  }

  log('migrate deploy');
  runPrisma('migrate deploy');
  log('done');
}

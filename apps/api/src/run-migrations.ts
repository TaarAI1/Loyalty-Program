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

function isRailwayDb(): boolean {
  const url = process.env.DATABASE_URL ?? '';
  return (
    !!process.env.RAILWAY_ENVIRONMENT ||
    url.includes('railway') ||
    url.includes('rlwy.net')
  );
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

function clearFailedMigrationSql(): void {
  const sql = `
DELETE FROM "_prisma_migrations"
WHERE migration_name = '${FAILED_MIGRATION}'
  AND finished_at IS NULL;
`;
  runPrisma('db execute --stdin', { ignoreError: true, input: sql });
}

function applySchema(): void {
  if (isRailwayDb()) {
    log('Railway DB — using prisma db push (bypasses broken migration history)');
    runPrisma('db push --accept-data-loss --skip-generate');
    return;
  }

  log('migrate deploy');
  try {
    runPrisma('migrate deploy');
  } catch {
    log('migrate deploy failed — falling back to db push');
    runPrisma('db push --accept-data-loss --skip-generate');
  }
}

export function runMigrationsBeforeBoot(): void {
  if (process.env.SKIP_DB_MIGRATE === '1') {
    log('SKIP_DB_MIGRATE=1 — skipping');
    return;
  }

  log(`heal starting (apiRoot=${getApiRoot()}, cwd=${process.cwd()}, railway=${isRailwayDb()})`);

  clearFailedMigrationSql();
  runPrisma(`migrate resolve --rolled-back ${FAILED_MIGRATION}`, { ignoreError: true });

  if (loyaltyTiersMissing()) {
    log('loyalty_tiers missing — applying init SQL');
    runPrisma(`db execute --file ${INIT_SQL}`);
  } else {
    log('loyalty_tiers OK');
  }

  applySchema();
  log('done');
}

/**
 * Production migrate deploy with self-heal for baselined-but-empty DBs.
 *
 * Railway sometimes records 20260514000001_init as applied without running its SQL.
 * Later migrations then fail (e.g. loyalty_tiers missing). This script:
 * 1. Applies init SQL if core tables are missing
 * 2. Marks failed migrations as rolled back so deploy can retry
 * 3. Runs prisma migrate deploy
 */
const { execSync } = require('child_process');
const { join } = require('path');
const { PrismaClient } = require('@prisma/client');

const API_ROOT = join(__dirname, '..');
const PRISMA_BIN = join(API_ROOT, 'node_modules', '.bin', 'prisma');
const INIT_SQL_REL = 'prisma/migrations/20260514000001_init/migration.sql';

function runPrisma(args) {
  const cmd = process.platform === 'win32' ? `"${PRISMA_BIN}" ${args}` : `${PRISMA_BIN} ${args}`;
  execSync(cmd, { cwd: API_ROOT, stdio: 'inherit', env: process.env });
}

async function loyaltyTiersMissing(prisma) {
  const rows = await prisma.$queryRaw`
    SELECT to_regclass('public.loyalty_tiers') IS NOT NULL AS "exists"
  `;
  return rows[0]?.exists !== true;
}

async function listFailedMigrations(prisma) {
  return prisma.$queryRaw`
    SELECT migration_name
    FROM "_prisma_migrations"
    WHERE finished_at IS NULL AND rolled_back_at IS NULL
  `;
}

async function main() {
  const prisma = new PrismaClient();
  try {
    if (await loyaltyTiersMissing(prisma)) {
      console.log('[migrate] Core tables missing — applying init migration SQL');
      runPrisma(`db execute --file ${INIT_SQL_REL}`);
    }

    const failed = await listFailedMigrations(prisma);
    for (const row of failed) {
      const name = row.migration_name;
      console.log(`[migrate] Rolling back failed migration: ${name}`);
      runPrisma(`migrate resolve --rolled-back "${name}"`);
    }

    console.log('[migrate] Running prisma migrate deploy');
    runPrisma('migrate deploy');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('[migrate] Deploy failed:', err);
  process.exit(1);
});

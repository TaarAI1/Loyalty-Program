-- Mark any stuck/failed migrations as rolled-back so prisma migrate deploy can re-apply them.
-- This is safe to run on every startup — the WHERE clause is a no-op when nothing is stuck.
UPDATE "_prisma_migrations"
SET "rolled_back_at" = NOW()
WHERE "finished_at" IS NULL
  AND "rolled_back_at" IS NULL;

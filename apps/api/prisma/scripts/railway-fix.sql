-- Run ONCE in Railway → PostgreSQL service → Data → Query (not the API shell).
-- Fixes P3009 failed migration and lets the API start.
-- Safe to re-run.

-- Remove the failed migration row blocking deploy
DELETE FROM "_prisma_migrations"
WHERE migration_name = '20260515000001_add_loyalty_best_practices'
  AND finished_at IS NULL;

-- Optional: if loyalty_tiers still does not exist, run the init migration file
-- from apps/api via: npx prisma db execute --file prisma/migrations/20260514000001_init/migration.sql

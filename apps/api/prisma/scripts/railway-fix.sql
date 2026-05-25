-- Run in Railway → PostgreSQL → Data → Query (one-time fix)
-- Then redeploy API with buildCommand: npm run build, start: node start.js

-- 1) Remove failed migration blocking deploy (P3009)
DELETE FROM "_prisma_migrations"
WHERE migration_name = '20260515000001_add_loyalty_best_practices'
  AND finished_at IS NULL;

-- 2) If init was marked applied but tables were never created, remove bogus init row
DELETE FROM "_prisma_migrations"
WHERE migration_name = '20260514000001_init'
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'loyalty_tiers'
  );

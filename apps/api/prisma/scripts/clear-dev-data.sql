-- Clear operational data on DEV Postgres (keeps admin user, tiers, channel config).
-- Run in Railway → Postgres (dev) → Data → Query
-- Then set SKIP_DEMO_SEED=1 on Backend (dev) before redeploying, or demo data returns on restart.

TRUNCATE TABLE
  "transaction_items",
  "points_ledger",
  "points_expiry",
  "notification_logs",
  "transactions",
  "customers",
  "forensic_alerts",
  "audit_log",
  "campaigns",
  "points_rules"
RESTART IDENTITY CASCADE;

-- Verify
SELECT 'customers' AS tbl, COUNT(*)::int AS rows FROM "customers"
UNION ALL SELECT 'transactions', COUNT(*)::int FROM "transactions";

#!/bin/sh

# Move into the api directory regardless of where Railway calls this script from
cd "$(dirname "$0")"
echo ">>> Working directory: $(pwd)"

# ── Step 1: Try a normal migrate deploy ─────────────────────────────────────
echo ">>> Running prisma migrate deploy..."
if node_modules/.bin/prisma migrate deploy; then
  echo ">>> Migrations OK."
else
  # ── Step 2: Deploy failed — wipe all tables + migration history and retry ──
  echo ">>> Migration failed — performing full database reset..."

  cat > /tmp/reset_db.sql << ENDSQL
DROP TABLE IF EXISTS "transaction_items"  CASCADE;
DROP TABLE IF EXISTS "points_expiry"      CASCADE;
DROP TABLE IF EXISTS "points_ledger"      CASCADE;
DROP TABLE IF EXISTS "notification_logs"  CASCADE;
DROP TABLE IF EXISTS "transactions"       CASCADE;
DROP TABLE IF EXISTS "customers"          CASCADE;
DROP TABLE IF EXISTS "campaigns"          CASCADE;
DROP TABLE IF EXISTS "points_rules"       CASCADE;
DROP TABLE IF EXISTS "loyalty_tiers"      CASCADE;
DROP TABLE IF EXISTS "whatsapp_config"    CASCADE;
DROP TABLE IF EXISTS "sms_config"         CASCADE;
DROP TABLE IF EXISTS "email_config"       CASCADE;
DROP TABLE IF EXISTS "audit_logs"         CASCADE;
DROP TABLE IF EXISTS "users"              CASCADE;
DELETE FROM "_prisma_migrations";
ENDSQL

  node_modules/.bin/prisma db execute \
    --file /tmp/reset_db.sql \
    --schema ./prisma/schema.prisma \
    && echo ">>> Reset complete." \
    || echo ">>> Reset step skipped."

  echo ">>> Re-running prisma migrate deploy..."
  node_modules/.bin/prisma migrate deploy || exit 1
fi

# ── Step 3: Start the application ───────────────────────────────────────────
echo ">>> Starting application..."
exec node dist/main

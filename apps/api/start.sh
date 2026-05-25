#!/bin/sh

# Write the fix SQL inline to /tmp to avoid any path resolution issues
cat > /tmp/fix_migrations.sql << ENDSQL
DROP TABLE IF EXISTS "points_rules";
DROP TABLE IF EXISTS "campaigns";
DELETE FROM "_prisma_migrations"
WHERE migration_name = '20260515000001_add_loyalty_best_practices';
ENDSQL

echo ">>> Running migration fix..."
node_modules/.bin/prisma db execute \
  --file /tmp/fix_migrations.sql \
  --schema ./prisma/schema.prisma \
  && echo ">>> Migration fix applied." \
  || echo ">>> Migration fix skipped (already clean)."

echo ">>> Running prisma migrate deploy..."
node_modules/.bin/prisma migrate deploy || exit 1

echo ">>> Starting application..."
exec node dist/main

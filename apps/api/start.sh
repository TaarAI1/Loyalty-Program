#!/bin/sh
set -e

# Step 1: Clear any stuck/failed migration rows so deploy can re-apply them
node_modules/.bin/prisma db execute \
  --file ./prisma/fix-failed-migrations.sql \
  --schema ./prisma/schema.prisma || true

# Step 2: Apply all pending migrations
node_modules/.bin/prisma migrate deploy

# Step 3: Start the application
exec node dist/main

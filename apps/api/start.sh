#!/bin/sh

# Move into the api directory regardless of where Railway calls this script from
cd "$(dirname "$0")"
echo ">>> Working directory: $(pwd)"

# ── Run migrations (safe — never drops tables) ───────────────────────────────
# If deploy fails (e.g. DB already has tables but _prisma_migrations is empty),
# we log a warning and start the app anyway using the existing schema.
# To fix a baseline issue, insert rows into _prisma_migrations manually via the
# Railway PostgreSQL query console — see project README for the SQL.
echo ">>> Running prisma migrate deploy..."
node_modules/.bin/prisma migrate deploy \
  && echo ">>> Migrations applied." \
  || echo ">>> Warning: could not apply all migrations - starting with existing schema."

# ── Start the application ────────────────────────────────────────────────────
echo ">>> Starting application..."
exec node dist/main

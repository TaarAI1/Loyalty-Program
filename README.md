# Loyalty Program — Full Stack Application

A production-ready customer loyalty management system built as a Turborepo monorepo with three Railway services.

## Architecture

```
loyalty-program/
├── apps/
│   ├── api/       # NestJS REST API (port 3001)
│   ├── worker/    # NestJS BullMQ Worker (background jobs)
│   └── web/       # Next.js 14 Frontend (port 3000)
├── packages/
│   └── shared/    # Shared TypeScript types, Zod schemas, utilities
├── railway.toml
└── turbo.json
```

## Tech Stack

| Layer | Technology |
|---|---|
| API | NestJS 10 + Fastify |
| Worker | NestJS 10 (application context) |
| Frontend | Next.js 14 App Router |
| Database | PostgreSQL via Prisma ORM |
| Cache/Queue | Redis + BullMQ |
| Styling | Tailwind CSS + custom shadcn-style components |
| Notifications | Meta WhatsApp Cloud API, Twilio SMS, SendGrid |
| Deployment | Railway (3 separate services) |

## Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 15+
- Redis 7+ (with `family:0` support on Railway)

## Quick Start (Local Development)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

```bash
# API
cp apps/api/.env.example apps/api/.env

# Worker
cp apps/worker/.env.example apps/worker/.env

# Frontend
cp apps/web/.env.example apps/web/.env
```

Edit each `.env` file with your values (see Environment Variables section below).

### 3. Run database migrations and seed

```bash
cd apps/api
pnpm db:migrate:dev   # runs prisma migrate dev
pnpm db:seed          # inserts default tiers
```

### 4. Start all services

```bash
# From workspace root
pnpm dev
```

This starts:
- API on http://localhost:3001
- Worker (background, no HTTP)
- Frontend on http://localhost:3000

## Environment Variables

### `apps/api/.env`

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `REDIS_URL` | Redis connection string | ✅ |
| `API_KEY` | API authentication key | ✅ |
| `ENCRYPTION_KEY` | 32-char key for AES-256 encryption | ✅ |
| `RETAILPRO_WEBHOOK_SECRET` | Shared secret for RetailPro webhooks | ✅ |
| `CORS_ORIGINS` | Comma-separated allowed origins | ✅ |
| `PORT` | API port (default: 3001) | — |
| `LOG_LEVEL` | Pino log level: debug/info/warn/error | — |
| `NODE_ENV` | production / development | — |

### `apps/worker/.env`

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | Same PostgreSQL connection string | ✅ |
| `REDIS_URL` | Same Redis connection string | ✅ |
| `ENCRYPTION_KEY` | Same key as API | ✅ |
| `LOG_LEVEL` | Pino log level | — |

### `apps/web/.env`

| Variable | Description | Required |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | API base URL (e.g. https://your-api.railway.app/api) | ✅ |
| `NEXT_PUBLIC_API_KEY` | API key matching `API_KEY` on the API service | ✅ |

## API Endpoints

### Webhooks (RetailPro Integration)

```
POST   /api/webhooks/transaction    # Process sale + award points
POST   /api/webhooks/customer       # Upsert customer profile
```

**Transaction webhook headers:**
```
X-Idempotency-Key: retailpro_TX12345
X-API-Key: your-retailpro-webhook-secret
```

### Customers

```
GET    /api/customers                # List with search + filters
GET    /api/customers/:id            # Customer detail + tier progress
GET    /api/customers/:id/history    # Transaction history (paginated)
GET    /api/customers/:id/points-ledger  # Points audit trail
PUT    /api/customers/:id            # Update customer profile
POST   /api/customers/:id/notify     # Send manual WhatsApp
```

### Configuration

```
GET    /api/configuration/loyalty-tiers     # Get all tiers
PUT    /api/configuration/loyalty-tiers     # Create/update tier
DELETE /api/configuration/loyalty-tiers/:id # Delete tier
GET    /api/configuration/whatsapp          # WhatsApp settings
PUT    /api/configuration/whatsapp          # Update WhatsApp settings
POST   /api/configuration/whatsapp/test     # Send test message
GET    /api/configuration/sms               # SMS settings
PUT    /api/configuration/sms               # Update SMS settings
GET    /api/configuration/email             # Email settings
PUT    /api/configuration/email             # Update email settings
```

### Reports

```
GET    /api/reports/filters          # Available filter options
GET    /api/reports/customer-tier    # PCG-9: Customer tier wise
GET    /api/reports/birthday-response # BRR7: Birthday response
GET    /api/reports/top-customers    # TCR18: Top customers
GET    /api/reports/loyalty-sales    # LSD6: Loyalty sales detail
GET    /api/reports/forensic         # SSFR8: Forensic report
```

### Dashboard

```
GET    /api/dashboard/metrics
GET    /api/dashboard/points-trend?days=30
GET    /api/dashboard/tier-distribution
GET    /api/dashboard/recent-transactions?limit=10
```

### Notifications

```
GET    /api/notifications            # Log with channel/status filters
GET    /api/notifications/stats      # 7-day stats by channel
POST   /api/notifications/:id/resend # Re-queue failed notification
```

### Health

```
GET    /api/health                   # Health check (no auth required)
```

## Background Jobs (Worker)

| Job | Schedule | Description |
|---|---|---|
| `PointsExpiryJob` | Daily 2 AM | Check expiring points, send WA warnings (D-7, D-3, D-1), deduct on expiry |
| `BirthdayJob` | Daily 6 AM | Find today's birthdays, send SMS with `BDAY30-{id}-{date}` code |
| `ForensicAlertJob` | Every hour | Flag customers with ≥5 transactions in 3 days, email alert team |
| `TierRecalcJob` | Daily 3 AM | Re-tier all active customers by lifetime spend, notify upgrades |

## Loyalty Tiers (Default)

| Tier | Spend Range | Points Range | Reward |
|---|---|---|---|
| Classic | PKR 1 – 50,001 | 0 – 2,000 | 4% |
| Silver | PKR 50,002 – 100,002 | 2,001 – 5,501 | 7% |
| Gold | PKR 100,003 – 250,003 | 5,502 – 20,502 | 10% |
| Platinum | PKR 250,004+ | 20,503+ | 15% |

Points formula: `ROUND(sale_amount × tier_percentage / 100)`

## Security Features

- **API Key Authentication** — All endpoints protected via `X-API-Key` header
- **Idempotency** — Transaction webhooks deduplicated via Redis (24h TTL)
- **AES-256-GCM Encryption** — WhatsApp/SMS/Email tokens encrypted at rest
- **Rate Limiting** — 100 requests/minute globally via `@nestjs/throttler`
- **Helmet** — HTTP security headers
- **CORS** — Configured allowlist
- **Negative Points Guard** — Redemption rejected if insufficient balance
- **Parameterized Queries** — All DB access via Prisma (no raw string injection)

## Deploying to Railway

1. Create a new Railway project
2. Add PostgreSQL and Redis add-ons
3. Create three services (this repo is a **pnpm monorepo** — use repo root as Root Directory):
   - **API**: Root Directory = `.` (repo root), Config file = `apps/api/railway.toml`, branch `Mahnoor`
   - **Worker**: Root Directory = `.`, Config file = `apps/worker/railway.toml`
   - **Web**: Root Directory = `.`, Config file = `apps/web/railway.toml`
4. Set environment variables for each service (see above)
5. Deploy the API service (migrations run automatically via `node start.js` on boot)
6. The seed runs automatically on first startup

**Railway API:** leave **Custom Build Command** empty (uses `pnpm` from `apps/api/railway.toml`). Leave **Custom Start Command** empty. Do not use `npm i` or `prisma migrate` in custom commands — the repo uses pnpm workspaces (`workspace:*`).

**If build fails with `Unsupported URL Type "workspace:"`:** Root Directory must be `.` (repo root), not `apps/api`.

If the database is stuck, open the **PostgreSQL** service → **Data** → **Query**, run `apps/api/prisma/scripts/railway-fix.sql`, then redeploy.

> **Redis note:** Railway Redis requires `family: 0` in ioredis options for IPv4/IPv6 compatibility. This is already configured.

## Frontend Pages

| Route | Description |
|---|---|
| `/dashboard` | KPI metrics, charts, recent transactions |
| `/customers` | Searchable customer table with CSV export |
| `/customers/[id]` | Profile, tier progress, transaction history, points ledger |
| `/configuration` | Tiers, WhatsApp, SMS, Email configuration |
| `/reports` | 5 report types with filter sidebar + CSV/Excel/PDF export |
| `/notifications` | Notification log with resend capability |

## Development Commands

```bash
# Install all dependencies
pnpm install

# Start all services in dev mode
pnpm dev

# Build all services
pnpm build

# Lint all services
pnpm lint

# Database commands (run from apps/api/)
pnpm db:generate     # regenerate Prisma client
pnpm db:migrate:dev  # run migrations (development)
pnpm db:migrate      # run migrations (production)
pnpm db:seed         # seed default tiers
```

## Logging

All services use **Pino JSON logging** in production with structured fields:

- **API requests**: `method`, `url`, `statusCode`, `responseTime`, `requestId`
- **Points events**: `customerId`, `transactionId`, `pointsEarned`, `runningBalance`, `tierFrom`, `tierTo`
- **Job execution**: `job`, `durationMs`, `processed`, `upgraded`
- **Notifications**: `channel`, `to`, `templateName`, `status`, `durationMs`
- **Config changes**: Written to `audit_log` table with `changedBy`, `entity`, `oldValue`, `newValue`

In development, logs use `pino-pretty` for human-readable colorized output.

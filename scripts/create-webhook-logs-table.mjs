// scripts/create-webhook-logs-table.mjs
// Creates webhook_logs table in both dev and demo DBs
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const { Client } = require('../scripts-tmp/node_modules/pg');

const DB_URLS = [
  { name: 'dev',  url: process.env.DEV_DB_URL  || 'postgresql://postgres:DZMezyfZZNyDUfABfMqTbWrlZhyYeYzt@zephyr.proxy.rlwy.net:38692/railway' },
  { name: 'demo', url: process.env.DEMO_DB_URL || 'postgresql://postgres:frbqalWSaFFGAlGSnSzwjjNQxkOcaWzR@altaria.proxy.rlwy.net:28464/railway' },
];

const SQL = `
CREATE TABLE IF NOT EXISTS webhook_logs (
  id             BIGSERIAL PRIMARY KEY,
  transaction_id VARCHAR(100),
  customer_mobile VARCHAR(20),
  store          VARCHAR(100),
  payload        JSONB,
  response       JSONB,
  status         VARCHAR(20) NOT NULL DEFAULT 'success',
  error_message  TEXT,
  duration_ms    INT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_mobile  ON webhook_logs(customer_mobile);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created ON webhook_logs(created_at DESC);
`;

for (const { name, url } of DB_URLS) {
  if (!url) {
    console.log(`⚠ Skipping ${name} — no URL provided`);
    continue;
  }
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log(`Connected to ${name} DB`);
    await client.query(SQL);
    console.log(`✓ webhook_logs table ready on ${name}`);
  } catch (err) {
    console.error(`✗ Failed on ${name}:`, err.message);
  } finally {
    await client.end();
  }
}

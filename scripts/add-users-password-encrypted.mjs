// Adds users.password_encrypted for admin Edit User (Oracle-style password display)
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { Client } = require('../scripts-tmp/node_modules/pg');

const DB_URLS = [
  { name: 'dev', url: process.env.DEV_DB_URL },
  { name: 'demo', url: process.env.DEMO_DB_URL },
].filter((e) => e.url);

const SQL = `
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_encrypted TEXT;
`;

if (DB_URLS.length === 0) {
  console.log('Set DEV_DB_URL and/or DEMO_DB_URL to run this migration.');
  process.exit(1);
}

for (const { name, url } of DB_URLS) {
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    await client.query(SQL);
    console.log(`OK: ${name} — password_encrypted column ready`);
  } catch (err) {
    console.error(`Failed on ${name}:`, err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

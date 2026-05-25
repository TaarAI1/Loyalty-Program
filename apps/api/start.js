#!/usr/bin/env node
/**
 * Production entrypoint — always use this on Railway: node start.js
 * Logs immediately so deploy logs prove the correct start command is used.
 */
console.log('\n========== REWARDLY API start.js ==========\n');

const { runMigrationsBeforeBoot } = require('./dist/run-migrations');

try {
  runMigrationsBeforeBoot();
} catch (err) {
  console.error('[rewardly] Migration step failed:', err);
  process.exit(1);
}

process.env.SKIP_DB_MIGRATE = '1';
require('./dist/main');

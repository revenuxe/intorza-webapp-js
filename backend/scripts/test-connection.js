#!/usr/bin/env node
/**
 * Quick RDS connectivity & schema sanity check.
 * Usage: node scripts/test-connection.js
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
});

(async () => {
  try {
    const v = await pool.query('SELECT version(), now() AS server_time');
    console.log('✓ Connected:', v.rows[0].version.split(',')[0]);
    console.log('  server_time:', v.rows[0].server_time);

    const t = await pool.query(`
      SELECT table_name, (SELECT COUNT(*) FROM information_schema.columns c
                          WHERE c.table_schema='public' AND c.table_name=t.table_name) AS cols
      FROM information_schema.tables t
      WHERE table_schema='public' AND table_type='BASE TABLE'
      ORDER BY table_name
    `);
    console.log(`\n${t.rows.length} tables in public schema:`);
    for (const r of t.rows) console.log(`  • ${r.table_name.padEnd(32)} (${r.cols} cols)`);

    const required = ['profiles','clients','quotations','quotation_sections','quotation_items','invoices','payments'];
    const missing = required.filter((x) => !t.rows.some((r) => r.table_name === x));
    if (missing.length) {
      console.warn('\n⚠ Missing required tables:', missing.join(', '));
      console.warn('  Run: bash scripts/apply-schema.sh');
      process.exit(2);
    }
    console.log('\n✓ All core tables present.');
  } catch (e) {
    console.error('✗ Connection failed:', e.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();

#!/usr/bin/env node
/**
 * Supabase → RDS data migration.
 *
 * Reads every relevant table from the Supabase REST API (using the service
 * role key) and inserts each row into AWS RDS. Idempotent: uses ON CONFLICT
 * (id) DO NOTHING so re-running is safe.
 *
 * Env required:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (NEVER ship to frontend)
 *   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_SSL
 *
 * Run:
 *   node scripts/migrate-data.js                # all tables
 *   node scripts/migrate-data.js quotations     # one table
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');

const TABLES = [
  'profiles',
  'user_roles',
  'clients',
  'quotations',
  'quotation_sections',
  'quotation_items',
  'quotation_item_images',
  'quotation_preferences',
  'invoices',
  'payments',
  'payment_logs',
  'team_members',
  'team_member_requests',
  'tasks',
  'team_project_assignments',
  'attendance',
  'terms_templates',
  'warranty_templates',
  'bank_detail_templates',
  'payment_templates',
  'section_templates',
  'quotation_templates',
  'item_usage_patterns',
  'gallery_images',
  'site_measurement_projects',
  'site_measurement_rooms',
  'room_photos',
  'feedback',
  'subscription_events',
  'user_activity',
];

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

const PAGE = 1000;

async function copyTable(table) {
  console.log(`\n--- ${table} ---`);
  let from = 0;
  let total = 0;
  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .range(from, from + PAGE - 1);
    if (error) {
      console.warn(`  skip (${error.message})`);
      return;
    }
    if (!data || data.length === 0) break;

    const cols = Object.keys(data[0]);
    const colList = cols.map((c) => `"${c}"`).join(',');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const row of data) {
        const values = cols.map((c) => normalize(row[c]));
        const placeholders = cols.map((_, i) => `$${i + 1}`).join(',');
        await client.query(
          `INSERT INTO ${table} (${colList}) VALUES (${placeholders})
           ON CONFLICT (id) DO NOTHING`,
          values,
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`  batch failed @ ${from}:`, err.message);
      throw err;
    } finally {
      client.release();
    }

    total += data.length;
    process.stdout.write(`  copied ${total}\r`);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  console.log(`  ✓ ${total} rows`);
}

function normalize(v) {
  if (v === undefined) return null;
  if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
    return JSON.stringify(v);
  }
  return v;
}

(async () => {
  const only = process.argv[2];
  const list = only ? [only] : TABLES;
  for (const t of list) {
    try { await copyTable(t); } catch (e) { console.error(`× ${t}:`, e.message); }
  }
  await pool.end();
  console.log('\ndone.');
})();

#!/usr/bin/env node
/**
 * Supabase → RDS data migration.
 *
 * Reads every relevant table from the Supabase REST API and inserts each row
 * into AWS RDS. Idempotent: uses ON CONFLICT (id) DO NOTHING so re-running
 * (e.g. the final delta/cutover pass) is safe.
 *
 * AUTH (important): the Supabase gateway validates the `apikey` HEADER against
 * the project's REAL anon/service keys — a self-minted JWT is rejected there
 * with "Invalid API key". So we send:
 *     apikey: <SUPABASE_ANON_KEY>
 *     Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>   (bypasses RLS)
 * If you have the genuine service_role key you may set it as BOTH (omit the
 * anon key); if you only have the JWT secret you can mint a service_role token
 * and pair it with the anon key — that is the supported path here.
 *
 * NORMALIZATION is driven by the REAL RDS column types (no guessing):
 *   jsonb/json -> JSON.stringify(value)   (avoids array-vs-jsonb mis-encoding)
 *   ARRAY      -> pass JS array through    (node-pg encodes text[]/uuid[]/…)
 *   else       -> value as-is
 * Columns present in Supabase but ABSENT in RDS are skipped (schema-divergence
 * guard) and logged once per table.
 *
 * Env required:
 *   SUPABASE_URL
 *   SUPABASE_ANON_KEY            (apikey header)
 *   SUPABASE_SERVICE_ROLE_KEY   (bearer; real key or a token minted from the
 *                                project JWT secret — NEVER ship to frontend)
 *   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_SSL
 *
 * Run:
 *   node scripts/migrate-data.js                # all tables
 *   node scripts/migrate-data.js quotations     # one table
 */
try { require('dotenv').config(); } catch { /* dotenv optional */ }
const { Pool } = require('pg');

// Ordered parents-before-children for FK safety. Verified against the real
// schema (schema.sql): gallery_images must precede quotation_item_images;
// team_members & quotations must precede tasks / assignments / site projects.
const TABLES = [
  'profiles',
  'user_roles',
  'clients',
  'gallery_images',            // referenced by quotation_item_images
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
  'site_measurement_projects',
  'site_measurement_rooms',
  'room_photos',
  'feedback',
  'subscription_events',
  'user_activity',
];

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.SUPABASE_ANON_KEY || SERVICE_KEY; // fall back when a real key works as both
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const REST_HEADERS = { apikey: ANON_KEY, Authorization: `Bearer ${SERVICE_KEY}` };

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

const PAGE = 1000;

// Lazily-built map: { table: { column: data_type } } from RDS information_schema.
let COLMETA = null;
async function loadColMeta() {
  if (COLMETA) return COLMETA;
  COLMETA = {};
  const { rows } = await pool.query(
    `select table_name, column_name, data_type
       from information_schema.columns where table_schema = 'public'`,
  );
  for (const r of rows) (COLMETA[r.table_name] ??= {})[r.column_name] = r.data_type;
  return COLMETA;
}

function normalize(table, col, v) {
  if (v === undefined || v === null) return null;
  const t = COLMETA[table] && COLMETA[table][col];
  if (t === 'jsonb' || t === 'json') return JSON.stringify(v);
  if (t === 'ARRAY') return v;                      // node-pg encodes JS arrays
  if (typeof v === 'object' && !Array.isArray(v)) return JSON.stringify(v); // safety net
  return v;
}

async function fetchPage(table, from) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
    headers: { ...REST_HEADERS, Range: `${from}-${from + PAGE - 1}` },
  });
  if (res.status !== 200 && res.status !== 206) {
    throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return res.json();
}

async function copyTable(table) {
  console.log(`\n--- ${table} ---`);
  const rdsCols = (await loadColMeta())[table];
  if (!rdsCols) { console.warn('  skip (no such table in RDS)'); return; }

  let from = 0;
  let total = 0;
  let inserted = 0;
  let loggedDropped = false;
  for (;;) {
    const data = await fetchPage(table, from);
    if (!data || data.length === 0) break;

    const supaCols = Object.keys(data[0]);
    const cols = supaCols.filter((c) => c in rdsCols);
    if (!loggedDropped) {
      const dropped = supaCols.filter((c) => !(c in rdsCols));
      if (dropped.length) console.warn(`  skipping cols absent in RDS: ${dropped.join(', ')}`);
      loggedDropped = true;
    }
    const colList = cols.map((c) => `"${c}"`).join(',');
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(',');
    const sql = `INSERT INTO "${table}" (${colList}) VALUES (${placeholders})
                 ON CONFLICT (id) DO NOTHING`;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const row of data) {
        const values = cols.map((c) => normalize(table, c, row[c]));
        const r = await client.query(sql, values);
        inserted += r.rowCount;
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
    process.stdout.write(`  read ${total}\r`);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  console.log(`  ✓ read ${total}, newly inserted ${inserted}`);
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

// PostgreSQL connection pool for AWS RDS.
// Pool is module-scoped so Lambda execution contexts can reuse connections
// across invocations (warm starts).

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 5,             // keep small for Lambda
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

pool.on('error', (err) => {
  console.error('[pg] idle client error', err);
});

/**
 * Run a parameterised query. ALWAYS use $1, $2 placeholders — never
 * interpolate user input into the SQL string.
 */
async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  if (process.env.LOG_SQL === 'true') {
    console.log('[sql]', { text, ms: Date.now() - start, rows: res.rowCount });
  }
  return res;
}

/** Convenience: run callback inside a transaction */
async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, tx };

// PostgreSQL connection pool for AWS RDS.
//
// Credential sourcing (in priority order):
//   1. AWS Secrets Manager — when DB_SECRET_ID (or DB_SECRET_ARN) is set, the
//      secret JSON is loaded once per Lambda execution context and reused on
//      warm starts. Expected JSON shape (RDS-managed secret compatible):
//        { "host": "...", "port": 5432, "dbname": "...",
//          "username": "...", "password": "..." }
//      Any field missing from the secret falls back to the matching DB_* env
//      var, so you can keep e.g. host/port in env and only the password in
//      Secrets Manager.
//   2. Plain DB_* environment variables — used for local dev and as fallback.
//
// The pool is created lazily (the first query awaits secret resolution) and is
// module-scoped so warm Lambda invocations reuse connections.

const { Pool } = require('pg');

let secretsClient = null; // lazy AWS SDK import — keep cold start cheap when unused

async function loadSecret() {
  const secretId = process.env.DB_SECRET_ID || process.env.DB_SECRET_ARN;
  if (!secretId) return {};
  try {
    if (!secretsClient) {
      // Lazy require so local dev without the SDK installed still works.
      const {
        SecretsManagerClient,
        GetSecretValueCommand,
      } = require('@aws-sdk/client-secrets-manager');
      secretsClient = {
        client: new SecretsManagerClient({
          region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION,
        }),
        GetSecretValueCommand,
      };
    }
    const { client, GetSecretValueCommand } = secretsClient;
    const out = await client.send(
      new GetSecretValueCommand({ SecretId: secretId }),
    );
    const raw = out.SecretString || Buffer.from(out.SecretBinary).toString('utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[pg] failed to load DB secret', secretId, err.message);
    throw err;
  }
}

async function buildPool() {
  const secret = await loadSecret();
  const pool = new Pool({
    host: secret.host || process.env.DB_HOST,
    port: Number(secret.port || process.env.DB_PORT || 5432),
    database: secret.dbname || secret.database || process.env.DB_NAME,
    user: secret.username || secret.user || process.env.DB_USER,
    password: secret.password || process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: 5, // keep small for Lambda
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  pool.on('error', (err) => {
    console.error('[pg] idle client error', err);
  });
  return pool;
}

// Memoised pool promise — survives warm starts.
let poolPromise = null;
function getPool() {
  if (!poolPromise) poolPromise = buildPool();
  return poolPromise;
}

/**
 * Run a parameterised query. ALWAYS use $1, $2 placeholders — never
 * interpolate user input into the SQL string.
 */
async function query(text, params) {
  const pool = await getPool();
  const start = Date.now();
  const res = await pool.query(text, params);
  if (process.env.LOG_SQL === 'true') {
    console.log('[sql]', { text, ms: Date.now() - start, rows: res.rowCount });
  }
  return res;
}

/** Convenience: run callback inside a transaction */
async function tx(fn) {
  const pool = await getPool();
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

module.exports = { getPool, query, tx };

// Shared CRUD router factory for simple, user-owned tables.
//
// Security model (same as quotations.js): every row is scoped by
// `user_id = req.user.id`. The factory injects that WHERE clause on every
// read/update/delete and forces user_id on insert, so it can never be omitted.
//
// Use this for flat tables. Hand-write routes (copy quotations.js) when you
// need joins, nested children, transactions, or non-user ownership scoping.

const express = require('express');
const { query } = require('./db');
const { asyncHandler, HttpError } = require('./errors');

/**
 * @param {object} opts
 * @param {string} opts.table          physical table name (trusted, not user input)
 * @param {string[]} opts.columns      writable columns (subset a client may set)
 * @param {string} [opts.scopeColumn]  ownership column (default 'user_id'; some
 *                                      tables, e.g. tasks/team_members, use
 *                                      'company_id', which still equals the
 *                                      authenticated user's id here)
 * @param {string} [opts.orderBy]      ORDER BY clause for list (default created_at DESC)
 * @param {string} [opts.listColumns]  columns to return on list (default *)
 * @param {number} [opts.limit]        list limit (default 1000)
 * @param {function} [opts.normalize]  (row, req) => row, applied to body before write
 */
function makeCrudRouter(opts) {
  const {
    table,
    columns,
    scopeColumn = 'user_id',
    orderBy = 'created_at DESC',
    listColumns = '*',
    limit = 1000,
    jsonbColumns = [],
    normalize,
  } = opts;
  const router = express.Router();
  const jsonbSet = new Set(jsonbColumns);

  // Column-aware serialisation:
  //  - jsonb columns (objects OR arrays) must be JSON.stringify'd for pg.
  //  - text[] columns (e.g. tags) must be passed as a JS array, NOT stringified.
  //  - plain objects default to JSON (safety) but arrays pass through.
  const toParam = (v, col) => {
    if (v === undefined) return null;
    if (jsonbSet.has(col)) return v === null ? null : JSON.stringify(v);
    if (v && typeof v === 'object' && !Array.isArray(v)) return JSON.stringify(v);
    return v;
  };

  // ---- LIST ----
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const { rows } = await query(
        `SELECT ${listColumns} FROM ${table}
          WHERE "${scopeColumn}" = $1 ORDER BY ${orderBy} LIMIT ${limit}`,
        [req.user.id],
      );
      res.json({ data: rows });
    }),
  );

  // ---- GET ONE ----
  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const { rows } = await query(
        `SELECT * FROM ${table} WHERE id = $1 AND "${scopeColumn}" = $2`,
        [req.params.id, req.user.id],
      );
      if (!rows[0]) throw new HttpError(404, `${table} row not found`);
      res.json({ data: rows[0] });
    }),
  );

  // ---- CREATE ----
  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const body = normalize ? normalize(req.body, req) : req.body;
      const cols = columns.filter((c) => body[c] !== undefined);
      const allCols = [scopeColumn, ...cols];
      const values = [req.user.id, ...cols.map((c) => toParam(body[c], c))];
      const placeholders = allCols.map((_, i) => `$${i + 1}`).join(',');
      const colList = allCols.map((c) => `"${c}"`).join(',');
      const { rows } = await query(
        `INSERT INTO ${table} (${colList}) VALUES (${placeholders}) RETURNING *`,
        values,
      );
      res.status(201).json({ data: rows[0] });
    }),
  );

  // ---- UPDATE (PUT/PATCH) ----
  const update = asyncHandler(async (req, res) => {
    const body = normalize ? normalize(req.body, req) : req.body;
    const cols = columns.filter((c) => body[c] !== undefined);
    if (cols.length === 0) throw new HttpError(400, 'No updatable fields supplied');
    const sets = cols.map((c, i) => `"${c}" = $${i + 3}`).join(', ');
    const values = [req.params.id, req.user.id, ...cols.map((c) => toParam(body[c], c))];
    const { rows } = await query(
      `UPDATE ${table} SET ${sets} WHERE id = $1 AND "${scopeColumn}" = $2 RETURNING *`,
      values,
    );
    if (!rows[0]) throw new HttpError(404, `${table} row not found`);
    res.json({ data: rows[0] });
  });
  router.put('/:id', update);
  router.patch('/:id', update);

  // ---- DELETE ----
  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const { rowCount } = await query(
        `DELETE FROM ${table} WHERE id = $1 AND "${scopeColumn}" = $2`,
        [req.params.id, req.user.id],
      );
      if (!rowCount) throw new HttpError(404, `${table} row not found`);
      res.status(204).end();
    }),
  );

  return router;
}

module.exports = { makeCrudRouter };

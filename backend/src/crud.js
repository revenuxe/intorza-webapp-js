// Generic CRUD router factory for simple user-scoped tables.
//
// Every row in every table MUST have a `user_id` column. The factory builds
// list/get/create/update/delete endpoints that all enforce `user_id = req.user.id`
// in their WHERE clause — that is the security boundary in RDS.

const express = require('express');
const { query } = require('./db');
const { asyncHandler, HttpError } = require('./errors');

/**
 * @param {object} opts
 * @param {string}   opts.table       - Postgres table name (public schema)
 * @param {string[]} opts.columns     - Writable columns (no id/user_id/timestamps)
 * @param {string}   [opts.orderBy]   - ORDER BY clause (default "created_at DESC")
 * @param {number}   [opts.limit]     - LIST limit (default 500)
 * @param {(req,body)=>object} [opts.beforeWrite] - Mutate/validate body before insert/update
 */
function crudRouter(opts) {
  const {
    table,
    columns,
    orderBy = 'created_at DESC',
    limit = 500,
    beforeWrite,
  } = opts;

  const router = express.Router();
  const cols = columns.join(', ');

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const { rows } = await query(
        `SELECT * FROM ${table} WHERE user_id = $1 ORDER BY ${orderBy} LIMIT ${limit}`,
        [req.user.id],
      );
      res.json({ data: rows });
    }),
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const { rows } = await query(
        `SELECT * FROM ${table} WHERE id = $1 AND user_id = $2`,
        [req.params.id, req.user.id],
      );
      if (!rows[0]) throw new HttpError(404, `${table} not found`);
      res.json({ data: rows[0] });
    }),
  );

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const body = beforeWrite ? beforeWrite(req, req.body) : req.body;
      const values = columns.map((c) => body?.[c] ?? null);
      const placeholders = columns.map((_, i) => `$${i + 2}`).join(', ');
      const { rows } = await query(
        `INSERT INTO ${table} (user_id, ${cols}) VALUES ($1, ${placeholders}) RETURNING *`,
        [req.user.id, ...values],
      );
      res.status(201).json({ data: rows[0] });
    }),
  );

  const updateHandler = asyncHandler(async (req, res) => {
    const body = beforeWrite ? beforeWrite(req, req.body) : req.body;
    const provided = columns.filter((c) => body?.[c] !== undefined);
    if (!provided.length) throw new HttpError(400, 'No updatable fields supplied');
    const setSql = provided.map((c, i) => `${c} = $${i + 3}`).join(', ');
    const params = [req.params.id, req.user.id, ...provided.map((c) => body[c])];
    const { rows } = await query(
      `UPDATE ${table} SET ${setSql}, updated_at = now()
         WHERE id = $1 AND user_id = $2 RETURNING *`,
      params,
    );
    if (!rows[0]) throw new HttpError(404, `${table} not found`);
    res.json({ data: rows[0] });
  });
  router.put('/:id', updateHandler);
  router.patch('/:id', updateHandler);

  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const { rowCount } = await query(
        `DELETE FROM ${table} WHERE id = $1 AND user_id = $2`,
        [req.params.id, req.user.id],
      );
      if (!rowCount) throw new HttpError(404, `${table} not found`);
      res.status(204).end();
    }),
  );

  return router;
}

module.exports = { crudRouter };

// Invoices + nested payments.
const express = require('express');
const { query, tx } = require('../db');
const { asyncHandler, HttpError } = require('../errors');

const router = express.Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT * FROM invoices WHERE user_id = $1 ORDER BY created_at DESC LIMIT 500`,
      [req.user.id],
    );
    res.json({ data: rows });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const inv = await query(
      `SELECT * FROM invoices WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id],
    );
    if (!inv.rows[0]) throw new HttpError(404, 'invoice not found');
    const payments = await query(
      `SELECT * FROM payments WHERE invoice_id = $1 ORDER BY payment_date DESC`,
      [req.params.id],
    );
    res.json({ data: { ...inv.rows[0], payments: payments.rows } });
  }),
);

const COLS = [
  'invoice_number', 'quotation_id', 'client_name', 'client_email', 'client_phone',
  'client_address', 'project_location', 'subtotal', 'gst_percent', 'gst_amount',
  'total_amount', 'paid_amount', 'status', 'due_date', 'notes', 'terms',
  'customization',
];

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const values = COLS.map((c) => req.body?.[c] ?? null);
    const placeholders = COLS.map((_, i) => `$${i + 2}`).join(', ');
    const { rows } = await query(
      `INSERT INTO invoices (user_id, ${COLS.join(', ')})
       VALUES ($1, ${placeholders}) RETURNING *`,
      [req.user.id, ...values],
    );
    res.status(201).json({ data: rows[0] });
  }),
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const provided = COLS.filter((c) => req.body?.[c] !== undefined);
    if (!provided.length) throw new HttpError(400, 'No fields supplied');
    const setSql = provided.map((c, i) => `${c} = $${i + 3}`).join(', ');
    const { rows } = await query(
      `UPDATE invoices SET ${setSql}, updated_at = now()
         WHERE id = $1 AND user_id = $2 RETURNING *`,
      [req.params.id, req.user.id, ...provided.map((c) => req.body[c])],
    );
    if (!rows[0]) throw new HttpError(404, 'invoice not found');
    res.json({ data: rows[0] });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { rowCount } = await tx(async (c) => {
      await c.query(`DELETE FROM payments WHERE invoice_id = $1`, [req.params.id]);
      const r = await c.query(
        `DELETE FROM invoices WHERE id = $1 AND user_id = $2`,
        [req.params.id, req.user.id],
      );
      return r;
    });
    if (!rowCount) throw new HttpError(404, 'invoice not found');
    res.status(204).end();
  }),
);

module.exports = router;

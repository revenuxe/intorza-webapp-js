// Payments — each payment belongs to an invoice owned by the calling user.
const express = require('express');
const { query, tx } = require('../db');
const { asyncHandler, HttpError } = require('../errors');

const router = express.Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { invoice_id } = req.query;
    if (invoice_id) {
      const own = await query(
        `SELECT 1 FROM invoices WHERE id = $1 AND user_id = $2`,
        [invoice_id, req.user.id],
      );
      if (!own.rowCount) throw new HttpError(404, 'invoice not found');
      const { rows } = await query(
        `SELECT * FROM payments WHERE invoice_id = $1 ORDER BY payment_date DESC`,
        [invoice_id],
      );
      return res.json({ data: rows });
    }
    const { rows } = await query(
      `SELECT p.* FROM payments p
         JOIN invoices i ON i.id = p.invoice_id
        WHERE i.user_id = $1
        ORDER BY p.payment_date DESC LIMIT 500`,
      [req.user.id],
    );
    res.json({ data: rows });
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { invoice_id, amount, payment_date, method, notes, reference } = req.body || {};
    if (!invoice_id || !amount) throw new HttpError(400, 'invoice_id and amount required');

    const result = await tx(async (c) => {
      const own = await c.query(
        `SELECT id, paid_amount, total_amount FROM invoices WHERE id = $1 AND user_id = $2 FOR UPDATE`,
        [invoice_id, req.user.id],
      );
      if (!own.rows[0]) throw new HttpError(404, 'invoice not found');

      const ins = await c.query(
        `INSERT INTO payments (invoice_id, amount, payment_date, method, notes, reference)
         VALUES ($1, $2, COALESCE($3, now()), $4, $5, $6) RETURNING *`,
        [invoice_id, amount, payment_date ?? null, method ?? null, notes ?? null, reference ?? null],
      );

      const newPaid = Number(own.rows[0].paid_amount || 0) + Number(amount);
      const status = newPaid >= Number(own.rows[0].total_amount) ? 'paid' : 'partial';
      await c.query(
        `UPDATE invoices SET paid_amount = $2, status = $3, updated_at = now() WHERE id = $1`,
        [invoice_id, newPaid, status],
      );
      return ins.rows[0];
    });
    res.status(201).json({ data: result });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const result = await tx(async (c) => {
      const p = await c.query(
        `SELECT p.* FROM payments p JOIN invoices i ON i.id = p.invoice_id
          WHERE p.id = $1 AND i.user_id = $2 FOR UPDATE`,
        [req.params.id, req.user.id],
      );
      if (!p.rows[0]) throw new HttpError(404, 'payment not found');
      await c.query(`DELETE FROM payments WHERE id = $1`, [req.params.id]);
      const sum = await c.query(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE invoice_id = $1`,
        [p.rows[0].invoice_id],
      );
      await c.query(
        `UPDATE invoices SET paid_amount = $2,
            status = CASE WHEN $2 >= total_amount THEN 'paid' WHEN $2 > 0 THEN 'partial' ELSE 'unpaid' END,
            updated_at = now()
          WHERE id = $1`,
        [p.rows[0].invoice_id, sum.rows[0].total],
      );
      return true;
    });
    res.status(204).end();
  }),
);

module.exports = router;

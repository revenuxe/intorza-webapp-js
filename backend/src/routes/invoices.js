// Invoices — user-owned, with nested payments. Real schema: invoices have
// total_amount / paid_amount / remaining_amount; payments have no owner column
// (owned via the invoice) and use payment_method / payment_date.

const express = require('express');
const { z } = require('zod');
const { query, tx } = require('../db');
const { asyncHandler, HttpError } = require('../errors');

const router = express.Router();

const InvoiceSchema = z.object({
  client_id: z.string().uuid().nullable().optional(),
  quotation_id: z.string().uuid().nullable().optional(),
  invoice_number: z.string().min(1),
  client_name: z.string().min(1),
  project_name: z.string().min(1),
  invoice_date: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  status: z.string().optional(),
  total_amount: z.number().optional(),
  paid_amount: z.number().optional(),
  remaining_amount: z.number().optional(),
  notes: z.string().nullable().optional(),
});

const COLS = [
  'client_id', 'quotation_id', 'invoice_number', 'client_name', 'project_name',
  'invoice_date', 'due_date', 'status', 'total_amount', 'paid_amount',
  'remaining_amount', 'notes',
];

// ---- LIST ----
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

// ---- GET ONE (with payments) ----
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT * FROM invoices WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id],
    );
    if (!rows[0]) throw new HttpError(404, 'Invoice not found');
    const pay = await query(
      `SELECT * FROM payments WHERE invoice_id = $1
        ORDER BY payment_date ASC NULLS LAST, created_at ASC`,
      [req.params.id],
    );
    res.json({ data: { ...rows[0], payments: pay.rows } });
  }),
);

// ---- CREATE ----
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = InvoiceSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, 'Invalid payload', parsed.error.flatten());
    const b = parsed.data;
    const cols = COLS.filter((c) => b[c] !== undefined);
    const allCols = ['user_id', ...cols];
    const values = [req.user.id, ...cols.map((c) => b[c])];
    const ph = allCols.map((_, i) => `$${i + 1}`).join(',');
    const { rows } = await query(
      `INSERT INTO invoices (${allCols.map((c) => `"${c}"`).join(',')})
       VALUES (${ph}) RETURNING *`,
      values,
    );
    res.status(201).json({ data: rows[0] });
  }),
);

// ---- UPDATE ----
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const parsed = InvoiceSchema.partial().safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, 'Invalid payload', parsed.error.flatten());
    const b = parsed.data;
    const cols = COLS.filter((c) => b[c] !== undefined);
    if (cols.length === 0) throw new HttpError(400, 'No updatable fields supplied');
    const sets = cols.map((c, i) => `"${c}" = $${i + 3}`).join(', ');
    const values = [req.params.id, req.user.id, ...cols.map((c) => b[c])];
    const { rows } = await query(
      `UPDATE invoices SET ${sets} WHERE id = $1 AND user_id = $2 RETURNING *`,
      values,
    );
    if (!rows[0]) throw new HttpError(404, 'Invoice not found');
    res.json({ data: rows[0] });
  }),
);

// ---- DELETE ----
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { rowCount } = await query(
      `DELETE FROM invoices WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id],
    );
    if (!rowCount) throw new HttpError(404, 'Invoice not found');
    res.status(204).end();
  }),
);

// ---- NESTED PAYMENTS ----
const PaymentSchema = z.object({
  amount: z.number(),
  payment_method: z.string().nullable().optional(),
  payment_date: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

// Recompute paid_amount / remaining_amount / status from the payment rows.
async function recalc(client, invoiceId) {
  const sum = await client.query(
    `SELECT COALESCE(SUM(amount),0) AS paid FROM payments WHERE invoice_id = $1`,
    [invoiceId],
  );
  const paid = Number(sum.rows[0].paid);
  const inv = await client.query(
    `SELECT total_amount, status FROM invoices WHERE id = $1`,
    [invoiceId],
  );
  const total = Number(inv.rows[0].total_amount);
  const remaining = total - paid;
  let status = inv.rows[0].status;
  if (status !== 'cancelled') {
    if (paid <= 0) status = 'unpaid';
    else if (remaining <= 0 && total > 0) status = 'paid';
    else status = 'partially_paid'; // must match the frontend's write path (InvoiceDetail.tsx)
  }
  await client.query(
    `UPDATE invoices SET paid_amount = $2, remaining_amount = $3, status = $4 WHERE id = $1`,
    [invoiceId, paid, remaining, status],
  );
}

router.get(
  '/:id/payments',
  asyncHandler(async (req, res) => {
    const owns = await query(
      `SELECT id FROM invoices WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id],
    );
    if (!owns.rows[0]) throw new HttpError(404, 'Invoice not found');
    const { rows } = await query(
      `SELECT * FROM payments WHERE invoice_id = $1
        ORDER BY payment_date ASC NULLS LAST, created_at ASC`,
      [req.params.id],
    );
    res.json({ data: rows });
  }),
);

router.post(
  '/:id/payments',
  asyncHandler(async (req, res) => {
    const parsed = PaymentSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, 'Invalid payload', parsed.error.flatten());
    const p = parsed.data;
    const result = await tx(async (client) => {
      const owns = await client.query(
        `SELECT id FROM invoices WHERE id = $1 AND user_id = $2`,
        [req.params.id, req.user.id],
      );
      if (!owns.rows[0]) throw new HttpError(404, 'Invoice not found');
      const ins = await client.query(
        `INSERT INTO payments (invoice_id, amount, payment_method, payment_date, notes)
         VALUES ($1,$2,$3,COALESCE($4, current_date),$5) RETURNING *`,
        [req.params.id, p.amount, p.payment_method ?? null, p.payment_date ?? null,
         p.notes ?? null],
      );
      await recalc(client, req.params.id);
      return ins.rows[0];
    });
    res.status(201).json({ data: result });
  }),
);

router.delete(
  '/:id/payments/:paymentId',
  asyncHandler(async (req, res) => {
    await tx(async (client) => {
      const owns = await client.query(
        `SELECT id FROM invoices WHERE id = $1 AND user_id = $2`,
        [req.params.id, req.user.id],
      );
      if (!owns.rows[0]) throw new HttpError(404, 'Invoice not found');
      const del = await client.query(
        `DELETE FROM payments WHERE id = $1 AND invoice_id = $2`,
        [req.params.paymentId, req.params.id],
      );
      if (!del.rowCount) throw new HttpError(404, 'Payment not found');
      await recalc(client, req.params.id);
    });
    res.status(204).end();
  }),
);

module.exports = router;

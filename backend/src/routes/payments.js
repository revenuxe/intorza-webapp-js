// Payments — read-only aggregate views. `payments` has no owner column, so we
// scope through the parent invoice (invoices.user_id). payment_logs is the
// Razorpay/subscription audit trail (written by the payment webhook).
//
// Per-invoice payment create/delete lives under /api/invoices/:id/payments.

const express = require('express');
const { query } = require('../db');
const { asyncHandler } = require('../errors');

const router = express.Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT p.*, i.invoice_number, i.client_name
         FROM payments p
         JOIN invoices i ON i.id = p.invoice_id
        WHERE i.user_id = $1
        ORDER BY p.payment_date DESC NULLS LAST, p.created_at DESC
        LIMIT 1000`,
      [req.user.id],
    );
    res.json({ data: rows });
  }),
);

router.get(
  '/logs',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT * FROM payment_logs WHERE user_id = $1
        ORDER BY created_at DESC LIMIT 500`,
      [req.user.id],
    );
    res.json({ data: rows });
  }),
);

module.exports = router;

// Library — the user's reusable templates. One sub-router per table, all flat
// and user-owned (crud.js factory). Column names match the real schema.

const express = require('express');
const { makeCrudRouter } = require('../crud');
const { query } = require('../db');
const { asyncHandler, HttpError } = require('../errors');

const router = express.Router();

router.use('/terms', makeCrudRouter({
  table: 'terms_templates',
  columns: ['template_name', 'template_type', 'content', 'country_code', 'is_default'],
  jsonbColumns: ['content'],
  orderBy: 'is_default DESC, created_at DESC',
}));

router.use('/warranty', makeCrudRouter({
  table: 'warranty_templates',
  columns: ['template_name', 'content', 'country_code', 'is_default'],
}));

router.use('/bank-details', makeCrudRouter({
  table: 'bank_detail_templates',
  columns: ['template_name', 'account_holder_name', 'account_number', 'bank_name',
            'ifsc_code', 'upi_id', 'qr_code_url', 'country_code', 'is_default'],
}));

router.use('/payment-templates', makeCrudRouter({
  table: 'payment_templates',
  columns: ['template_name', 'stages', 'country_code', 'is_default'],
  jsonbColumns: ['stages'],
}));

router.use('/sections', makeCrudRouter({
  table: 'section_templates',
  columns: ['template_name', 'category', 'items', 'country_code', 'is_default', 'usage_count'],
  jsonbColumns: ['items'],
}));

router.use('/quotation-templates', makeCrudRouter({
  table: 'quotation_templates',
  columns: ['template_name', 'category', 'description', 'sections', 'is_default', 'usage_count'],
  jsonbColumns: ['sections'],
}));

// Item usage patterns — list + upsert keyed by (user_id, lower(product_name)).
// No DB unique constraint, so the upsert is done explicitly inside a query pair.
const itemRouter = express.Router();
itemRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT * FROM item_usage_patterns WHERE user_id = $1
        ORDER BY usage_count DESC, last_used_at DESC NULLS LAST LIMIT 2000`,
      [req.user.id],
    );
    res.json({ data: rows });
  }),
);
itemRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const b = req.body || {};
    if (!b.product_name) throw new HttpError(400, 'product_name is required');
    const existing = await query(
      `SELECT id, usage_count FROM item_usage_patterns
        WHERE user_id = $1 AND lower(product_name) = lower($2) LIMIT 1`,
      [req.user.id, b.product_name],
    );
    if (existing.rows[0]) {
      const { rows } = await query(
        `UPDATE item_usage_patterns SET
           product_details = COALESCE($2, product_details),
           category        = COALESCE($3, category),
           default_rate    = COALESCE($4, default_rate),
           preferred_rate  = COALESCE($5, preferred_rate),
           country_code    = COALESCE($6, country_code),
           usage_count     = usage_count + 1,
           last_used_at    = now()
         WHERE id = $1 RETURNING *`,
        [existing.rows[0].id, b.product_details ?? null, b.category ?? null,
         b.default_rate ?? null, b.preferred_rate ?? null, b.country_code ?? null],
      );
      return res.json({ data: rows[0] });
    }
    const { rows } = await query(
      `INSERT INTO item_usage_patterns
         (user_id, product_name, product_details, category, default_rate,
          preferred_rate, country_code, usage_count, last_used_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,1), now()) RETURNING *`,
      [req.user.id, b.product_name, b.product_details ?? null, b.category ?? null,
       b.default_rate ?? null, b.preferred_rate ?? null, b.country_code ?? null,
       b.usage_count ?? null],
    );
    res.status(201).json({ data: rows[0] });
  }),
);
itemRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { rowCount } = await query(
      `DELETE FROM item_usage_patterns WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id],
    );
    if (!rowCount) throw new HttpError(404, 'Item pattern not found');
    res.status(204).end();
  }),
);
router.use('/items', itemRouter);

module.exports = router;

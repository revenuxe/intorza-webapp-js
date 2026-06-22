// Quotations — full reference implementation. Mirror this pattern for every
// other resource (invoices, clients, tasks, …).
//
// Security model: every query is scoped by `user_id = $current_user`. The
// JWT-verified user id comes from req.user.id. There is no RLS in RDS — the
// WHERE clause IS the security boundary, so it must never be omitted.

const express = require('express');
const { z } = require('zod');
const { query, tx } = require('../db');
const { asyncHandler, HttpError } = require('../errors');

const router = express.Router();

// ---------- Schemas ----------
const ItemSchema = z.object({
  id: z.string().uuid().optional(),
  section_id: z.string().uuid().nullable().optional(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  width: z.number().nullable().optional(),
  length: z.number().nullable().optional(),
  area: z.number().nullable().optional(),
  quantity: z.number().default(1),
  unit: z.string().nullable().optional(),
  rate: z.number().default(0),
  discount_percent: z.number().default(0),
  amount: z.number().default(0),
  sort_order: z.number().default(0),
});

const QuotationSchema = z.object({
  quotation_number: z.string().min(1),
  client_name: z.string().min(1),
  client_email: z.string().email().nullable().optional(),
  client_phone: z.string().nullable().optional(),
  client_address: z.string().nullable().optional(),
  project_location: z.string().nullable().optional(),
  project_deadline: z.string().nullable().optional(),
  status: z.enum(['draft', 'sent', 'accepted', 'rejected']).default('draft'),
  subtotal: z.number().default(0),
  gst_percent: z.number().default(0),
  gst_amount: z.number().default(0),
  total_amount: z.number().default(0),
  notes: z.string().nullable().optional(),
  terms: z.string().nullable().optional(),
  payment_stages: z.any().nullable().optional(),
  customization: z.any().nullable().optional(),
  items: z.array(ItemSchema).default([]),
});

// ---------- LIST ----------
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT id, quotation_number, client_name, project_location,
              status, total_amount, created_at, updated_at
         FROM quotations
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 500`,
      [req.user.id],
    );
    res.json({ data: rows });
  }),
);

// ---------- GET ONE (with items) ----------
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT * FROM quotations WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id],
    );
    if (!rows[0]) throw new HttpError(404, 'Quotation not found');

    const items = await query(
      `SELECT * FROM quotation_items
        WHERE quotation_id = $1
        ORDER BY sort_order ASC, created_at ASC`,
      [req.params.id],
    );
    res.json({ data: { ...rows[0], items: items.rows } });
  }),
);

// ---------- CREATE ----------
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = QuotationSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, 'Invalid payload', parsed.error.flatten());

    const q = parsed.data;
    const result = await tx(async (client) => {
      const ins = await client.query(
        `INSERT INTO quotations
          (user_id, quotation_number, client_name, client_email, client_phone,
           client_address, project_location, project_deadline, status, subtotal,
           gst_percent, gst_amount, total_amount, notes, terms,
           payment_stages, customization)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         RETURNING *`,
        [
          req.user.id, q.quotation_number, q.client_name, q.client_email,
          q.client_phone, q.client_address, q.project_location, q.project_deadline,
          q.status, q.subtotal, q.gst_percent, q.gst_amount, q.total_amount,
          q.notes, q.terms, q.payment_stages, q.customization,
        ],
      );
      const quotation = ins.rows[0];

      for (const item of q.items) {
        await client.query(
          `INSERT INTO quotation_items
             (quotation_id, section_id, name, description, width, length, area,
              quantity, unit, rate, discount_percent, amount, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
          [
            quotation.id, item.section_id ?? null, item.name, item.description ?? null,
            item.width ?? null, item.length ?? null, item.area ?? null,
            item.quantity, item.unit ?? null, item.rate, item.discount_percent,
            item.amount, item.sort_order,
          ],
        );
      }
      return quotation;
    });

    res.status(201).json({ data: result });
  }),
);

// ---------- UPDATE ----------
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const parsed = QuotationSchema.partial({ items: true }).safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, 'Invalid payload', parsed.error.flatten());

    const q = parsed.data;

    const result = await tx(async (client) => {
      const owns = await client.query(
        `SELECT id FROM quotations WHERE id = $1 AND user_id = $2`,
        [req.params.id, req.user.id],
      );
      if (!owns.rows[0]) throw new HttpError(404, 'Quotation not found');

      const upd = await client.query(
        `UPDATE quotations SET
            quotation_number = COALESCE($2, quotation_number),
            client_name      = COALESCE($3, client_name),
            client_email     = $4,
            client_phone     = $5,
            client_address   = $6,
            project_location = $7,
            project_deadline = $8,
            status           = COALESCE($9, status),
            subtotal         = COALESCE($10, subtotal),
            gst_percent      = COALESCE($11, gst_percent),
            gst_amount       = COALESCE($12, gst_amount),
            total_amount     = COALESCE($13, total_amount),
            notes            = $14,
            terms            = $15,
            payment_stages   = $16,
            customization    = $17,
            updated_at       = now()
          WHERE id = $1
          RETURNING *`,
        [
          req.params.id, q.quotation_number, q.client_name, q.client_email,
          q.client_phone, q.client_address, q.project_location, q.project_deadline,
          q.status, q.subtotal, q.gst_percent, q.gst_amount, q.total_amount,
          q.notes, q.terms, q.payment_stages, q.customization,
        ],
      );

      if (req.body.items) {
        await client.query(`DELETE FROM quotation_items WHERE quotation_id = $1`, [req.params.id]);
        for (const item of req.body.items) {
          await client.query(
            `INSERT INTO quotation_items
               (quotation_id, section_id, name, description, width, length, area,
                quantity, unit, rate, discount_percent, amount, sort_order)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
            [
              req.params.id, item.section_id ?? null, item.name, item.description ?? null,
              item.width ?? null, item.length ?? null, item.area ?? null,
              item.quantity ?? 1, item.unit ?? null, item.rate ?? 0,
              item.discount_percent ?? 0, item.amount ?? 0, item.sort_order ?? 0,
            ],
          );
        }
      }
      return upd.rows[0];
    });

    res.json({ data: result });
  }),
);

// ---------- DELETE ----------
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { rowCount } = await query(
      `DELETE FROM quotations WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id],
    );
    if (!rowCount) throw new HttpError(404, 'Quotation not found');
    res.status(204).end();
  }),
);

module.exports = router;

// Quotations — the core resource. Real hierarchy: quotation → sections → items
// (quotation_items belong to a SECTION via section_id, NOT directly to the
// quotation). Security: every query scoped by user_id = req.user.id (no RLS).

const express = require('express');
const { z } = require('zod');
const { query, tx } = require('../db');
const { asyncHandler, HttpError } = require('../errors');

const router = express.Router();

// ---------- Schemas ----------
const ItemSchema = z.object({
  id: z.string().uuid().optional(),
  product_name: z.string().min(1),
  product_details: z.string().nullable().optional(),
  side: z.string().nullable().optional(),
  depth: z.string().nullable().optional(),
  width_ft: z.number().nullable().optional(),
  height_ft: z.number().nullable().optional(),
  sft_area: z.number().nullable().optional(),
  rate_per_sft: z.number().nullable().optional(),
  amount: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  sort_order: z.number().default(0),
});

const SectionSchema = z.object({
  id: z.string().uuid().optional(),
  section_name: z.string().min(1),
  sort_order: z.number().default(0),
  items: z.array(ItemSchema).default([]),
});

const QuotationSchema = z.object({
  client_id: z.string().uuid().nullable().optional(),
  quotation_number: z.string().min(1),
  quotation_title: z.string().nullable().optional(),
  client_name: z.string().min(1),
  client_address: z.string().nullable().optional(),
  project_name: z.string().min(1),
  project_type: z.string().nullable().optional(),
  place_of_project: z.string().nullable().optional(),
  date_of_proposal: z.string().nullable().optional(),
  project_deadline: z.string().nullable().optional(),
  valid_till: z.string().nullable().optional(),
  status: z.string().default('draft'),
  subtotal: z.number().default(0),
  discount_amount: z.number().default(0),
  gst_enabled: z.boolean().default(false),
  gst_percentage: z.number().default(0),
  gst_amount: z.number().default(0),
  grand_total: z.number().default(0),
  warranty: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  sections: z.array(SectionSchema).default([]),
});

const Q_COLS = [
  'client_id', 'quotation_number', 'quotation_title', 'client_name', 'client_address',
  'project_name', 'project_type', 'place_of_project', 'date_of_proposal',
  'project_deadline', 'valid_till', 'status', 'subtotal', 'discount_amount',
  'gst_enabled', 'gst_percentage', 'gst_amount', 'grand_total', 'warranty', 'notes',
];

// Insert a quotation's sections + their items inside an open transaction.
async function insertSections(client, quotationId, sections) {
  for (const section of sections) {
    const sec = await client.query(
      `INSERT INTO quotation_sections (quotation_id, section_name, sort_order)
       VALUES ($1,$2,$3) RETURNING id`,
      [quotationId, section.section_name, section.sort_order ?? 0],
    );
    const sectionId = sec.rows[0].id;
    for (const item of section.items || []) {
      await client.query(
        `INSERT INTO quotation_items
           (section_id, product_name, product_details, side, depth, width_ft,
            height_ft, sft_area, rate_per_sft, amount, notes, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          sectionId, item.product_name, item.product_details ?? null,
          item.side ?? null, item.depth ?? null, item.width_ft ?? null,
          item.height_ft ?? null, item.sft_area ?? null, item.rate_per_sft ?? null,
          item.amount ?? null, item.notes ?? null, item.sort_order ?? 0,
        ],
      );
    }
  }
}

// ---------- LIST ----------
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT id, quotation_number, quotation_title, client_name, project_name,
              place_of_project, status, grand_total, created_at, updated_at
         FROM quotations
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 500`,
      [req.user.id],
    );
    res.json({ data: rows });
  }),
);

// ---------- GET ONE (with sections + items) ----------
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT * FROM quotations WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id],
    );
    if (!rows[0]) throw new HttpError(404, 'Quotation not found');

    const sections = await query(
      `SELECT s.*,
              COALESCE(
                (SELECT json_agg(i.* ORDER BY i.sort_order, i.created_at)
                   FROM quotation_items i WHERE i.section_id = s.id), '[]'
              ) AS items
         FROM quotation_sections s
        WHERE s.quotation_id = $1
        ORDER BY s.sort_order ASC, s.created_at ASC`,
      [req.params.id],
    );
    res.json({ data: { ...rows[0], sections: sections.rows } });
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
      const cols = Q_COLS.filter((c) => q[c] !== undefined);
      const allCols = ['user_id', ...cols];
      const values = [req.user.id, ...cols.map((c) => q[c])];
      const ph = allCols.map((_, i) => `$${i + 1}`).join(',');
      const ins = await client.query(
        `INSERT INTO quotations (${allCols.map((c) => `"${c}"`).join(',')})
         VALUES (${ph}) RETURNING *`,
        values,
      );
      const quotation = ins.rows[0];
      await insertSections(client, quotation.id, q.sections);
      return quotation;
    });

    res.status(201).json({ data: result });
  }),
);

// ---------- UPDATE ----------
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const parsed = QuotationSchema.partial({ sections: true }).safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, 'Invalid payload', parsed.error.flatten());
    const q = parsed.data;

    const result = await tx(async (client) => {
      const owns = await client.query(
        `SELECT id FROM quotations WHERE id = $1 AND user_id = $2`,
        [req.params.id, req.user.id],
      );
      if (!owns.rows[0]) throw new HttpError(404, 'Quotation not found');

      const cols = Q_COLS.filter((c) => q[c] !== undefined);
      let updated;
      if (cols.length) {
        const sets = cols.map((c, i) => `"${c}" = $${i + 3}`).join(', ');
        const upd = await client.query(
          `UPDATE quotations SET ${sets}, updated_at = now()
            WHERE id = $1 AND user_id = $2 RETURNING *`,
          [req.params.id, req.user.id, ...cols.map((c) => q[c])],
        );
        updated = upd.rows[0];
      } else {
        const cur = await client.query(`SELECT * FROM quotations WHERE id = $1`, [req.params.id]);
        updated = cur.rows[0];
      }

      // If sections supplied, replace the whole tree (items cascade-delete with sections).
      if (req.body.sections !== undefined) {
        await client.query(
          `DELETE FROM quotation_sections WHERE quotation_id = $1`,
          [req.params.id],
        );
        await insertSections(client, req.params.id, q.sections || []);
      }
      return updated;
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

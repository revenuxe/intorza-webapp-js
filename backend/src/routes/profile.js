// Profile — single row per auth user. `profiles.id` is the auth.users uuid.
const express = require('express');
const { query } = require('../db');
const { asyncHandler, HttpError } = require('../errors');

const router = express.Router();

// All profile endpoints operate on the calling user's row only.
router.get(
  '/me',
  asyncHandler(async (req, res) => {
    const { rows } = await query(`SELECT * FROM profiles WHERE id = $1`, [req.user.id]);
    if (!rows[0]) {
      // Auto-provision row on first read so frontend never has to handle 404.
      const ins = await query(
        `INSERT INTO profiles (id, email) VALUES ($1, $2)
           ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email
         RETURNING *`,
        [req.user.id, req.user.email ?? null],
      );
      return res.json({ data: ins.rows[0] });
    }
    res.json({ data: rows[0] });
  }),
);

router.patch(
  '/me',
  asyncHandler(async (req, res) => {
    const allowed = [
      'full_name', 'company_name', 'phone', 'address', 'website',
      'logo_url', 'signature_url', 'qr_code_url',
      'currency', 'gst_percent', 'gst_number', 'pan_number',
      'bank_name', 'account_number', 'ifsc_code', 'account_holder',
      'invoice_prefix', 'quotation_prefix',
      'primary_color', 'secondary_color', 'accent_color',
      'font_heading', 'font_body',
      'place_of_business', 'state', 'country',
      'pdf_settings', 'preferences', 'metadata',
    ];
    const provided = allowed.filter((c) => req.body?.[c] !== undefined);
    if (!provided.length) throw new HttpError(400, 'No fields supplied');

    const setSql = provided.map((c, i) => `${c} = $${i + 2}`).join(', ');
    const params = [req.user.id, ...provided.map((c) => req.body[c])];
    const { rows } = await query(
      `UPDATE profiles SET ${setSql}, updated_at = now()
         WHERE id = $1 RETURNING *`,
      params,
    );
    if (!rows[0]) throw new HttpError(404, 'profile not found');
    res.json({ data: rows[0] });
  }),
);

module.exports = router;

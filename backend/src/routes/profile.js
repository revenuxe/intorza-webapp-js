// Profile — per-user singleton in `profiles` (PK = Supabase auth user id), plus
// quotation_preferences and roles. Upsert semantics. Pro/payment fields are
// server-controlled (set by the payment webhook) and are NOT client-writable.

const express = require('express');
const { query } = require('../db');
const { asyncHandler } = require('../errors');

const router = express.Router();

const PROFILE_COLS = [
  'address', 'bank_account_holder', 'bank_account_number', 'bank_ifsc_code',
  'bank_name', 'brand_colors', 'company_name', 'country_code', 'country_name',
  'currency_code', 'currency_symbol', 'date_format', 'email', 'full_name',
  'gstin', 'invoice_terms_conditions', 'locale', 'logo_url', 'measurement_system',
  'number_format', 'org_code', 'payment_qr_url', 'payment_stages',
  'pdf_body_font', 'pdf_heading_font', 'phone', 'professional_advantages',
  'signature_url', 'tax_label', 'terms_conditions', 'timezone', 'upi_id',
];
// NOT writable here: is_pro, pro_expiry, pro_plan, pro_since, payment_provider,
// payment_status, provider_customer_id, provider_subscription_id, action_count,
// last_feedback_at, promo_code.

const PREF_COLS = [
  'default_discount_percentage', 'default_gst_enabled', 'default_gst_rate',
  'default_place_of_project', 'default_project_type', 'default_quotation_valid_days',
  'default_social_media_discount_enabled', 'default_social_media_discount_rate',
  'default_warranty', 'last_discount_percentage', 'last_gst_enabled',
  'last_gst_rate', 'last_place_of_project', 'last_project_type',
  'last_social_media_discount_enabled', 'last_social_media_discount_rate',
  'last_warranty',
];

// profiles has no text[] columns, so any object/array value targets a jsonb
// column and must be JSON-serialised.
const param = (v) => (v && typeof v === 'object' ? JSON.stringify(v) : v);

// ---- GET PROFILE ----
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { rows } = await query(`SELECT * FROM profiles WHERE id = $1`, [req.user.id]);
    res.json({ data: rows[0] || null });
  }),
);

// ---- UPSERT PROFILE ----
router.put(
  '/',
  asyncHandler(async (req, res) => {
    const b = req.body || {};
    const cols = PROFILE_COLS.filter((c) => b[c] !== undefined);
    const insCols = ['id', ...cols];
    const insVals = [req.user.id, ...cols.map((c) => param(b[c]))];
    const ph = insCols.map((_, i) => `$${i + 1}`).join(',');
    const updateSets = cols.length
      ? cols.map((c) => `"${c}" = EXCLUDED."${c}"`).join(', ')
      : 'id = profiles.id';
    const { rows } = await query(
      `INSERT INTO profiles (${insCols.map((c) => `"${c}"`).join(',')})
       VALUES (${ph})
       ON CONFLICT (id) DO UPDATE SET ${updateSets}
       RETURNING *`,
      insVals,
    );
    res.json({ data: rows[0] });
  }),
);

// ---- ROLES ----
router.get(
  '/roles',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT role FROM user_roles WHERE user_id = $1`,
      [req.user.id],
    );
    res.json({ data: rows.map((r) => r.role) });
  }),
);

// ---- PREFERENCES (quotation_preferences, one row per user) ----
router.get(
  '/preferences',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT * FROM quotation_preferences WHERE user_id = $1`,
      [req.user.id],
    );
    res.json({ data: rows[0] || null });
  }),
);

router.put(
  '/preferences',
  asyncHandler(async (req, res) => {
    const b = req.body || {};
    const cols = PREF_COLS.filter((c) => b[c] !== undefined);
    const insCols = ['user_id', ...cols];
    const insVals = [req.user.id, ...cols.map((c) => param(b[c]))];
    const ph = insCols.map((_, i) => `$${i + 1}`).join(',');
    const updateSets = cols.length
      ? cols.map((c) => `"${c}" = EXCLUDED."${c}"`).join(', ')
      : 'user_id = quotation_preferences.user_id';
    const { rows } = await query(
      `INSERT INTO quotation_preferences (${insCols.map((c) => `"${c}"`).join(',')})
       VALUES (${ph})
       ON CONFLICT (user_id) DO UPDATE SET ${updateSets}
       RETURNING *`,
      insVals,
    );
    res.json({ data: rows[0] });
  }),
);

module.exports = router;

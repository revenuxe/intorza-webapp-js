// Library — all user-scoped template tables exposed under one router.
const express = require('express');
const { crudRouter } = require('../crud');

const router = express.Router();

router.use('/terms', crudRouter({
  table: 'terms_templates',
  columns: ['name', 'content', 'category', 'is_default', 'sort_order'],
}));

router.use('/warranty', crudRouter({
  table: 'warranty_templates',
  columns: ['name', 'content', 'duration_months', 'is_default'],
}));

router.use('/payment-stages', crudRouter({
  table: 'payment_templates',
  columns: ['name', 'stages', 'is_default'],
}));

router.use('/bank-details', crudRouter({
  table: 'bank_detail_templates',
  columns: [
    'template_name', 'account_holder', 'account_number', 'ifsc_code',
    'bank_name', 'branch', 'upi_id', 'qr_code_url', 'is_default',
    'sort_order', 'notes', 'metadata',
  ],
}));

router.use('/quotation-templates', crudRouter({
  table: 'quotation_templates',
  columns: ['name', 'description', 'category', 'data', 'thumbnail_url', 'is_default', 'sort_order'],
}));

router.use('/section-templates', crudRouter({
  table: 'section_templates',
  columns: ['name', 'category', 'items', 'thumbnail_url', 'is_default', 'sort_order', 'description'],
}));

router.use('/items', crudRouter({
  table: 'item_usage_patterns',
  columns: [
    'item_name', 'description', 'category', 'unit', 'default_rate',
    'usage_count', 'last_used_at', 'metadata', 'image_url', 'tags',
  ],
  orderBy: 'usage_count DESC NULLS LAST, last_used_at DESC NULLS LAST',
}));

router.use('/preferences', crudRouter({
  table: 'quotation_preferences',
  columns: [
    'currency', 'gst_percent', 'show_logo', 'show_signature', 'show_qr',
    'show_terms', 'show_warranty', 'show_payment_stages', 'show_bank_details',
    'header_layout', 'highlight_total', 'show_response_buttons',
    'pdf_theme', 'font_heading', 'font_body',
    'primary_color', 'secondary_color', 'accent_color',
    'metadata',
  ],
}));

module.exports = router;

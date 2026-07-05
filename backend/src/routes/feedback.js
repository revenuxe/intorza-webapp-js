// Feedback — users submit. user_id comes from the verified token.
// Real columns: trigger_action (NOT NULL), rating (NOT NULL), feedback_type, message.
const express = require('express');
const { query } = require('../db');
const { asyncHandler, HttpError } = require('../errors');

const router = express.Router();

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const b = req.body || {};
    if (!b.trigger_action) throw new HttpError(400, 'trigger_action is required');
    if (b.rating === undefined || b.rating === null) {
      throw new HttpError(400, 'rating is required');
    }
    const { rows } = await query(
      `INSERT INTO feedback (user_id, trigger_action, rating, feedback_type, message)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.user.id, b.trigger_action, b.rating, b.feedback_type ?? null, b.message ?? null],
    );
    res.status(201).json({ data: rows[0] });
  }),
);

module.exports = router;

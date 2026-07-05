// Site measurements — projects → rooms → photos. Projects are user-owned;
// rooms and photos inherit ownership through their project, verified on every
// write. Column names match the real schema (room_name, width_ft/length_ft,
// pricing fields; room_photos.photo_url).

const express = require('express');
const { query, tx } = require('../db');
const { asyncHandler, HttpError } = require('../errors');

const router = express.Router();

const param = (v) => (v && typeof v === 'object' ? JSON.stringify(v) : v);
const PROJECT_COLS = ['client_name', 'site_location', 'assigned_to', 'quotation_id',
                      'status', 'room_count', 'photo_count', 'total_area'];
const ROOM_COLS = ['room_name', 'room_type', 'width_ft', 'length_ft', 'height_ft',
                   'area_sqft', 'pricing_mode', 'quantity', 'rate_per_sqft',
                   'rate_per_unit', 'lump_sum_amount', 'final_amount', 'notes', 'sort_order'];

async function assertProjectOwner(projectId, userId, client = null) {
  const runner = client || { query };
  const { rows } = await runner.query(
    `SELECT id FROM site_measurement_projects WHERE id = $1 AND user_id = $2`,
    [projectId, userId],
  );
  if (!rows[0]) throw new HttpError(404, 'Project not found');
}

// ---- PROJECTS: LIST ----
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT * FROM site_measurement_projects WHERE user_id = $1
        ORDER BY created_at DESC LIMIT 1000`,
      [req.user.id],
    );
    res.json({ data: rows });
  }),
);

// ---- PROJECT: GET ONE (with rooms + photos) ----
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT * FROM site_measurement_projects WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id],
    );
    if (!rows[0]) throw new HttpError(404, 'Project not found');
    const rooms = await query(
      `SELECT r.*,
              COALESCE(
                (SELECT json_agg(p.* ORDER BY p.created_at)
                   FROM room_photos p WHERE p.room_id = r.id), '[]'
              ) AS photos
         FROM site_measurement_rooms r
        WHERE r.project_id = $1
        ORDER BY r.sort_order ASC, r.created_at ASC`,
      [req.params.id],
    );
    res.json({ data: { ...rows[0], rooms: rooms.rows } });
  }),
);

// ---- PROJECT: CREATE ----
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const b = req.body || {};
    if (!b.client_name) throw new HttpError(400, 'client_name is required');
    const cols = PROJECT_COLS.filter((c) => b[c] !== undefined);
    const allCols = ['user_id', ...cols];
    const values = [req.user.id, ...cols.map((c) => param(b[c]))];
    const ph = allCols.map((_, i) => `$${i + 1}`).join(',');
    const { rows } = await query(
      `INSERT INTO site_measurement_projects (${allCols.map((c) => `"${c}"`).join(',')})
       VALUES (${ph}) RETURNING *`,
      values,
    );
    res.status(201).json({ data: rows[0] });
  }),
);

// ---- PROJECT: UPDATE ----
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const b = req.body || {};
    const cols = PROJECT_COLS.filter((c) => b[c] !== undefined);
    if (!cols.length) throw new HttpError(400, 'No updatable fields supplied');
    const sets = cols.map((c, i) => `"${c}" = $${i + 3}`).join(', ');
    const values = [req.params.id, req.user.id, ...cols.map((c) => param(b[c]))];
    const { rows } = await query(
      `UPDATE site_measurement_projects SET ${sets}, updated_at = now()
        WHERE id = $1 AND user_id = $2 RETURNING *`,
      values,
    );
    if (!rows[0]) throw new HttpError(404, 'Project not found');
    res.json({ data: rows[0] });
  }),
);

// ---- PROJECT: DELETE (cascades rooms + photos) ----
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { rowCount } = await query(
      `DELETE FROM site_measurement_projects WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id],
    );
    if (!rowCount) throw new HttpError(404, 'Project not found');
    res.status(204).end();
  }),
);

// ---- ROOMS ----
router.post(
  '/:id/rooms',
  asyncHandler(async (req, res) => {
    const b = req.body || {};
    if (!b.room_type) throw new HttpError(400, 'room_type is required');
    const result = await tx(async (client) => {
      await assertProjectOwner(req.params.id, req.user.id, client);
      const cols = ROOM_COLS.filter((c) => b[c] !== undefined);
      const allCols = ['project_id', ...cols];
      const values = [req.params.id, ...cols.map((c) => param(b[c]))];
      const ph = allCols.map((_, i) => `$${i + 1}`).join(',');
      const { rows } = await client.query(
        `INSERT INTO site_measurement_rooms (${allCols.map((c) => `"${c}"`).join(',')})
         VALUES (${ph}) RETURNING *`,
        values,
      );
      return rows[0];
    });
    res.status(201).json({ data: result });
  }),
);

router.put(
  '/:id/rooms/:roomId',
  asyncHandler(async (req, res) => {
    const b = req.body || {};
    const result = await tx(async (client) => {
      await assertProjectOwner(req.params.id, req.user.id, client);
      const cols = ROOM_COLS.filter((c) => b[c] !== undefined);
      if (!cols.length) throw new HttpError(400, 'No updatable fields supplied');
      const sets = cols.map((c, i) => `"${c}" = $${i + 3}`).join(', ');
      const values = [req.params.roomId, req.params.id, ...cols.map((c) => param(b[c]))];
      const { rows } = await client.query(
        `UPDATE site_measurement_rooms SET ${sets}, updated_at = now()
          WHERE id = $1 AND project_id = $2 RETURNING *`,
        values,
      );
      if (!rows[0]) throw new HttpError(404, 'Room not found');
      return rows[0];
    });
    res.json({ data: result });
  }),
);

router.delete(
  '/:id/rooms/:roomId',
  asyncHandler(async (req, res) => {
    await tx(async (client) => {
      await assertProjectOwner(req.params.id, req.user.id, client);
      const del = await client.query(
        `DELETE FROM site_measurement_rooms WHERE id = $1 AND project_id = $2`,
        [req.params.roomId, req.params.id],
      );
      if (!del.rowCount) throw new HttpError(404, 'Room not found');
    });
    res.status(204).end();
  }),
);

// ---- ROOM PHOTOS ----
router.post(
  '/:id/rooms/:roomId/photos',
  asyncHandler(async (req, res) => {
    const b = req.body || {};
    if (!b.photo_url) throw new HttpError(400, 'photo_url is required');
    const result = await tx(async (client) => {
      await assertProjectOwner(req.params.id, req.user.id, client);
      const owns = await client.query(
        `SELECT id FROM site_measurement_rooms WHERE id = $1 AND project_id = $2`,
        [req.params.roomId, req.params.id],
      );
      if (!owns.rows[0]) throw new HttpError(404, 'Room not found');
      const { rows } = await client.query(
        `INSERT INTO room_photos (room_id, photo_url, caption) VALUES ($1,$2,$3) RETURNING *`,
        [req.params.roomId, b.photo_url, b.caption ?? null],
      );
      return rows[0];
    });
    res.status(201).json({ data: result });
  }),
);

router.delete(
  '/:id/rooms/:roomId/photos/:photoId',
  asyncHandler(async (req, res) => {
    await tx(async (client) => {
      await assertProjectOwner(req.params.id, req.user.id, client);
      const del = await client.query(
        `DELETE FROM room_photos p USING site_measurement_rooms r
          WHERE p.id = $1 AND p.room_id = r.id AND r.id = $2 AND r.project_id = $3`,
        [req.params.photoId, req.params.roomId, req.params.id],
      );
      if (!del.rowCount) throw new HttpError(404, 'Photo not found');
    });
    res.status(204).end();
  }),
);

module.exports = router;

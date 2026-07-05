// Team — members, join requests, project assignments, attendance.
// Real schema: team_members/team_member_requests are scoped by company_id
// (= owner profile/auth id). assignments & attendance have no owner column —
// they're owned via their team_member's company_id, verified on every write.
// (Creating a member's auth login still uses the Supabase edge function
// `create-team-member-auth`; this route owns the DB rows.)

const express = require('express');
const { makeCrudRouter } = require('../crud');
const { query, tx } = require('../db');
const { asyncHandler, HttpError } = require('../errors');

const router = express.Router();

// ---- MEMBERS (company_id scoped) ----
router.use('/members', makeCrudRouter({
  table: 'team_members',
  scopeColumn: 'company_id',
  columns: ['user_id', 'name', 'email', 'phone', 'work_type', 'status', 'daily_rate'],
  orderBy: 'created_at DESC',
}));

// ---- REQUESTS (company_id scoped; owner manages status) ----
const reqRouter = express.Router();
reqRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT * FROM team_member_requests
        WHERE company_id = $1 OR user_id = $1
        ORDER BY created_at DESC`,
      [req.user.id],
    );
    res.json({ data: rows });
  }),
);
reqRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const b = req.body || {};
    if (!b.company_id || !b.name || !b.email) {
      throw new HttpError(400, 'company_id, name and email are required');
    }
    const { rows } = await query(
      `INSERT INTO team_member_requests
         (company_id, user_id, name, email, phone, work_type, status, docs_request_note)
       VALUES ($1,$2,$3,$4,$5,COALESCE($6,'other'),COALESCE($7,'pending'),$8)
       RETURNING *`,
      [b.company_id, req.user.id, b.name, b.email, b.phone ?? null,
       b.work_type ?? null, b.status ?? null, b.docs_request_note ?? null],
    );
    res.status(201).json({ data: rows[0] });
  }),
);
reqRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const b = req.body || {};
    const { rows } = await query(
      `UPDATE team_member_requests SET
          status            = COALESCE($3, status),
          docs_request_note = COALESCE($4, docs_request_note),
          rejection_reason  = COALESCE($5, rejection_reason),
          updated_at        = now()
        WHERE id = $1 AND company_id = $2
        RETURNING *`,
      [req.params.id, req.user.id, b.status ?? null, b.docs_request_note ?? null,
       b.rejection_reason ?? null],
    );
    if (!rows[0]) throw new HttpError(404, 'Request not found');
    res.json({ data: rows[0] });
  }),
);
reqRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { rowCount } = await query(
      `DELETE FROM team_member_requests
        WHERE id = $1 AND (company_id = $2 OR user_id = $2)`,
      [req.params.id, req.user.id],
    );
    if (!rowCount) throw new HttpError(404, 'Request not found');
    res.status(204).end();
  }),
);
router.use('/requests', reqRouter);

// ---- helper: assert a team_member belongs to the caller's company ----
async function assertMemberOwner(memberId, userId, client) {
  const { rows } = await client.query(
    `SELECT id FROM team_members WHERE id = $1 AND company_id = $2`,
    [memberId, userId],
  );
  if (!rows[0]) throw new HttpError(404, 'Team member not found');
}

// ---- ASSIGNMENTS (owned via team_member.company_id) ----
const asgRouter = express.Router();
asgRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT a.* FROM team_project_assignments a
         JOIN team_members m ON m.id = a.team_member_id
        WHERE m.company_id = $1
        ORDER BY a.assigned_at DESC`,
      [req.user.id],
    );
    res.json({ data: rows });
  }),
);
asgRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const b = req.body || {};
    if (!b.team_member_id) throw new HttpError(400, 'team_member_id is required');
    const result = await tx(async (client) => {
      await assertMemberOwner(b.team_member_id, req.user.id, client);
      const { rows } = await client.query(
        `INSERT INTO team_project_assignments (team_member_id, quotation_id, notes)
         VALUES ($1,$2,$3) RETURNING *`,
        [b.team_member_id, b.quotation_id ?? null, b.notes ?? null],
      );
      return rows[0];
    });
    res.status(201).json({ data: result });
  }),
);
asgRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await tx(async (client) => {
      const del = await client.query(
        `DELETE FROM team_project_assignments a
          USING team_members m
          WHERE a.id = $1 AND a.team_member_id = m.id AND m.company_id = $2`,
        [req.params.id, req.user.id],
      );
      if (!del.rowCount) throw new HttpError(404, 'Assignment not found');
    });
    res.status(204).end();
  }),
);
router.use('/assignments', asgRouter);

// ---- ATTENDANCE (owned via team_member.company_id) ----
const attRouter = express.Router();
attRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT a.* FROM attendance a
         JOIN team_members m ON m.id = a.team_member_id
        WHERE m.company_id = $1
        ORDER BY a.clock_in DESC LIMIT 2000`,
      [req.user.id],
    );
    res.json({ data: rows });
  }),
);
attRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const b = req.body || {};
    if (!b.team_member_id) throw new HttpError(400, 'team_member_id is required');
    const param = (v) => (v && typeof v === 'object' ? JSON.stringify(v) : v);
    const result = await tx(async (client) => {
      await assertMemberOwner(b.team_member_id, req.user.id, client);
      const { rows } = await client.query(
        `INSERT INTO attendance
           (team_member_id, clock_in, clock_out, clock_in_location, clock_out_location, notes)
         VALUES ($1, COALESCE($2, now()), $3, $4, $5, $6) RETURNING *`,
        [b.team_member_id, b.clock_in ?? null, b.clock_out ?? null,
         param(b.clock_in_location) ?? null, param(b.clock_out_location) ?? null,
         b.notes ?? null],
      );
      return rows[0];
    });
    res.status(201).json({ data: result });
  }),
);
attRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const b = req.body || {};
    const param = (v) => (v && typeof v === 'object' ? JSON.stringify(v) : v);
    const result = await tx(async (client) => {
      const { rows } = await client.query(
        `UPDATE attendance a SET
            clock_out          = COALESCE($3, a.clock_out),
            clock_out_location = COALESCE($4, a.clock_out_location),
            notes              = COALESCE($5, a.notes)
          FROM team_members m
          WHERE a.id = $1 AND a.team_member_id = m.id AND m.company_id = $2
          RETURNING a.*`,
        [req.params.id, req.user.id, b.clock_out ?? null,
         param(b.clock_out_location) ?? null, b.notes ?? null],
      );
      if (!rows[0]) throw new HttpError(404, 'Attendance record not found');
      return rows[0];
    });
    res.json({ data: result });
  }),
);
router.use('/attendance', attRouter);

module.exports = router;

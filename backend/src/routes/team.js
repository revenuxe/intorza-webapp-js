// Team — members + requests + assignments + attendance, all user-scoped
// (user_id is the owner/manager of the team).
const express = require('express');
const { crudRouter } = require('../crud');

const router = express.Router();

router.use('/members', crudRouter({
  table: 'team_members',
  columns: ['name', 'email', 'phone', 'role', 'status', 'auth_user_id', 'avatar_url', 'metadata', 'org_code'],
}));

router.use('/requests', crudRouter({
  table: 'team_member_requests',
  columns: ['name', 'email', 'phone', 'requested_role', 'status', 'org_code', 'auth_user_id', 'metadata', 'reviewed_at', 'review_notes'],
}));

router.use('/assignments', crudRouter({
  table: 'team_project_assignments',
  columns: ['team_member_id', 'project_id', 'role'],
}));

router.use('/attendance', crudRouter({
  table: 'attendance',
  columns: [
    'team_member_id', 'clock_in', 'clock_out',
    'clock_in_location', 'clock_out_location', 'notes',
  ],
  orderBy: 'clock_in DESC',
}));

module.exports = router;

// Tasks — owned by company_id (= the owner's profile/auth id). See crud.js.
const { makeCrudRouter } = require('../crud');

module.exports = makeCrudRouter({
  table: 'tasks',
  scopeColumn: 'company_id',
  columns: [
    'assigned_to', 'quotation_id', 'title', 'description',
    'status', 'priority', 'due_date', 'completed_at',
  ],
  orderBy: 'created_at DESC',
});

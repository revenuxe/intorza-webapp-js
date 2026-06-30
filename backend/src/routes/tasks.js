module.exports = require('../crud').crudRouter({
  table: 'tasks',
  columns: [
    'title', 'description', 'status', 'priority', 'due_date',
    'assigned_to', 'project_id', 'quotation_id', 'metadata', 'completed_at',
  ],
});

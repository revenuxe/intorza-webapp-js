// Clients — flat user-owned table. See crud.js for the security model.
const { makeCrudRouter } = require('../crud');

module.exports = makeCrudRouter({
  table: 'clients',
  columns: ['name', 'email', 'phone', 'address'],
  orderBy: 'created_at DESC',
});

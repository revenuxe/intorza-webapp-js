module.exports = require('../crud').crudRouter({
  table: 'clients',
  columns: ['name', 'email', 'phone', 'address', 'company', 'notes'],
});

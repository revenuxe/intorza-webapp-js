const express = require('express');
const { crudRouter } = require('../crud');

const router = express.Router();

router.use('/projects', crudRouter({
  table: 'site_measurement_projects',
  columns: ['name', 'client_name', 'address', 'notes', 'status', 'project_date', 'metadata'],
}));

router.use('/rooms', crudRouter({
  table: 'site_measurement_rooms',
  columns: [
    'project_id', 'name', 'room_type', 'length', 'width', 'height', 'area',
    'unit', 'notes', 'floor_type', 'wall_type', 'ceiling_type',
    'electrical_points', 'plumbing_points', 'photos', 'metadata', 'sort_order',
  ],
}));

router.use('/photos', crudRouter({
  table: 'room_photos',
  columns: ['room_id', 'image_url', 's3_key', 'caption'],
}));

module.exports = router;

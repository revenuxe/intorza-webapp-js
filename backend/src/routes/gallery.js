module.exports = require('../crud').crudRouter({
  table: 'gallery_images',
  columns: [
    'image_url', 'filename', 'tags', 'category', 'description',
    'width', 'height', 'size_bytes', 'mime_type', 's3_key', 'thumbnail_url',
    'metadata', 'sort_order',
  ],
});

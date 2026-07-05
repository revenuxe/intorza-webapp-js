// Gallery images — flat user-owned table. The binary lives in S3 (image_url);
// here we track the row + metadata.
const { makeCrudRouter } = require('../crud');

module.exports = makeCrudRouter({
  table: 'gallery_images',
  columns: [
    'filename', 'image_url', 'title', 'description', 'category', 'tags',
    'width', 'height', 'file_size', 'is_favorite', 'usage_count',
  ],
  orderBy: 'created_at DESC',
});

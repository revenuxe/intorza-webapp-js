// S3 presigned URL issuer. Frontend asks for a PUT URL, uploads directly to S3,
// then calls the resource API with the returned object URL.
//
// Prefix isolation: object keys are FORCED into `users/{req.user.id}/...`.
// The client cannot specify another user's prefix.

const express = require('express');
const { randomUUID } = require('crypto');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { asyncHandler, HttpError } = require('../errors');

const BUCKET = process.env.AWS_BUCKET || process.env.S3_BUCKET;
const REGION = process.env.AWS_REGION || 'us-east-1';

const s3 = new S3Client({
  region: REGION,
  credentials: process.env.AWS_ACCESS_KEY_ID
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined, // fall back to Lambda IAM role
});

const ALLOWED_KINDS = new Set([
  'logo', 'signature', 'qr', 'gallery', 'room', 'invoice', 'quotation', 'generic',
]);
const ALLOWED_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'pdf', 'svg']);
const MAX_BYTES = 10 * 1024 * 1024; // 10MB

function publicUrl(key) {
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}

const router = express.Router();

router.post(
  '/sign-upload',
  asyncHandler(async (req, res) => {
    if (!BUCKET) throw new HttpError(500, 'AWS_BUCKET not configured');
    const { kind = 'generic', filename, contentType = 'application/octet-stream', size } = req.body || {};
    if (!ALLOWED_KINDS.has(kind)) throw new HttpError(400, 'invalid kind');
    if (size && Number(size) > MAX_BYTES) throw new HttpError(400, 'file too large (max 10MB)');

    const ext = (filename?.split('.').pop() || '').toLowerCase();
    if (filename && !ALLOWED_EXT.has(ext)) throw new HttpError(400, 'extension not allowed');

    const key = `users/${req.user.id}/${kind}/${randomUUID()}${ext ? '.' + ext : ''}`;
    const cmd = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType });
    const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 900 });

    res.json({
      data: {
        uploadUrl,
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        key,
        bucket: BUCKET,
        url: publicUrl(key),
        expiresIn: 900,
      },
    });
  }),
);

router.post(
  '/sign-download',
  asyncHandler(async (req, res) => {
    if (!BUCKET) throw new HttpError(500, 'AWS_BUCKET not configured');
    const { key } = req.body || {};
    if (!key || typeof key !== 'string') throw new HttpError(400, 'key required');
    if (!key.startsWith(`users/${req.user.id}/`)) throw new HttpError(403, 'forbidden');

    const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
    const url = await getSignedUrl(s3, cmd, { expiresIn: 900 });
    res.json({ data: { url, expiresIn: 900 } });
  }),
);

module.exports = router;

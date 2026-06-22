// Shared stub generator for routes that haven't been ported yet. Each route
// file below exports a router built from this so the server boots cleanly and
// returns 501 for not-yet-implemented endpoints.

const express = require('express');

function makeStub(resource) {
  const router = express.Router();
  router.all('/*', (req, res) => {
    res.status(501).json({
      error: 'Not implemented',
      message: `[${resource}] ${req.method} ${req.originalUrl} — port this route by copying backend/src/routes/quotations.js`,
    });
  });
  return router;
}

module.exports = { makeStub };

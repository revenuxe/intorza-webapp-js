// Express app — wired by both the Lambda handler (src/index.js) and the local
// dev server (src/dev.js). Keep this file framework-only; put DB/auth logic in
// the route modules.

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const { requireAuth } = require('./auth');
const { notFound, errorHandler } = require('./errors');

const app = express();

app.use(express.json({ limit: '5mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

const allowedOrigins = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map((s) => s.trim());
app.use(
  cors({
    origin: allowedOrigins.includes('*') ? true : allowedOrigins,
    credentials: false,
  }),
);

// Health — public
app.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

// All /api/* routes require a valid Supabase JWT
app.use('/api', requireAuth);

app.use('/api/quotations', require('./routes/quotations'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/team', require('./routes/team'));
app.use('/api/library', require('./routes/library'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/gallery', require('./routes/gallery'));
app.use('/api/site-measurements', require('./routes/site-measurements'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;

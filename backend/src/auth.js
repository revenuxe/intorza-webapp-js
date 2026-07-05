// Supabase JWT verification middleware.
//
// Supabase signs access tokens with an asymmetric key (ES256/RS256) exposed at
// /auth/v1/.well-known/jwks.json. We verify the signature with `jose`'s JWKS
// remote helper which caches the keyset in-memory between invocations.
//
// On success the decoded claims are attached as `req.user`:
//   { sub: <auth user uuid>, email, role, ... }

const { createRemoteJWKSet, jwtVerify } = require('jose');

// Supabase projects sign access tokens one of two ways:
//   1. Legacy: symmetric HS256 using the project's "JWT secret" (shared secret).
//      The /.well-known/jwks.json endpoint is EMPTY for these projects.
//   2. Modern: asymmetric ES256/RS256 exposed via JWKS.
// We support both. If SUPABASE_JWT_SECRET is set we verify HS256 with it;
// otherwise we fall back to the remote JWKS (asymmetric).

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
const JWKS_URL = process.env.SUPABASE_JWKS_URL;

const HS_KEY = JWT_SECRET ? new TextEncoder().encode(JWT_SECRET) : null;
const JWKS = JWKS_URL ? createRemoteJWKSet(new URL(JWKS_URL)) : null;

if (!HS_KEY && !JWKS) {
  console.warn('[auth] neither SUPABASE_JWT_SECRET nor SUPABASE_JWKS_URL set — every request will 401');
}

const AUDIENCE = process.env.SUPABASE_JWT_AUDIENCE || 'authenticated';
const ISSUER = process.env.SUPABASE_URL
  ? `${process.env.SUPABASE_URL.replace(/\/$/, '')}/auth/v1`
  : undefined;

async function verifyToken(token) {
  const opts = { audience: AUDIENCE, issuer: ISSUER };
  if (HS_KEY) {
    const { payload } = await jwtVerify(token, HS_KEY, opts);
    return payload;
  }
  if (JWKS) {
    const { payload } = await jwtVerify(token, JWKS, opts);
    return payload;
  }
  throw new Error('No JWT verification key configured');
}

/** Express middleware — rejects request unless a valid Supabase JWT is present. */
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing bearer token' });
    }
    const token = header.slice(7);
    const claims = await verifyToken(token);
    if (!claims.sub) return res.status(401).json({ error: 'Invalid token' });
    req.user = {
      id: claims.sub,
      email: claims.email,
      role: claims.role,
      claims,
    };
    next();
  } catch (err) {
    console.warn('[auth] verification failed', err.message);
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

/** Optional auth — populates req.user when token present but doesn't reject. */
async function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    try {
      const claims = await verifyToken(header.slice(7));
      req.user = { id: claims.sub, email: claims.email, role: claims.role, claims };
    } catch {
      /* swallow */
    }
  }
  next();
}

module.exports = { requireAuth, optionalAuth, verifyToken };

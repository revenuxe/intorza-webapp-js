// Supabase JWT verification middleware.
//
// Supabase signs access tokens with an asymmetric key (ES256/RS256) exposed at
// /auth/v1/.well-known/jwks.json. We verify the signature with `jose`'s JWKS
// remote helper which caches the keyset in-memory between invocations.
//
// On success the decoded claims are attached as `req.user`:
//   { sub: <auth user uuid>, email, role, ... }

const { createRemoteJWKSet, jwtVerify } = require('jose');

const JWKS_URL = process.env.SUPABASE_JWKS_URL;
if (!JWKS_URL) {
  console.warn('[auth] SUPABASE_JWKS_URL is not set — every request will 401');
}

const JWKS = JWKS_URL ? createRemoteJWKSet(new URL(JWKS_URL)) : null;
const AUDIENCE = process.env.SUPABASE_JWT_AUDIENCE || 'authenticated';
const ISSUER = process.env.SUPABASE_URL
  ? `${process.env.SUPABASE_URL.replace(/\/$/, '')}/auth/v1`
  : undefined;

async function verifyToken(token) {
  if (!JWKS) throw new Error('JWKS not configured');
  const { payload } = await jwtVerify(token, JWKS, {
    audience: AUDIENCE,
    issuer: ISSUER,
  });
  return payload;
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

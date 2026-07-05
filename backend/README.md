# Intorza Backend (AWS Amplify Functions + RDS PostgreSQL)

Express-based Lambda API. Supabase is used **only** for issuing JWTs; this
backend verifies them and owns all data in AWS RDS PostgreSQL.

## Layout

```
backend/
├── src/
│   ├── index.js          # Lambda handler (serverless-http wrapper)
│   ├── server.js         # Express app + route registration
│   ├── db.js             # pg Pool (SSL, env-driven)
│   ├── auth.js           # Supabase JWT verification middleware
│   ├── errors.js         # Async wrapper + error handler
│   └── routes/
│       ├── quotations.js # Full reference implementation
│       ├── invoices.js
│       ├── clients.js
│       ├── tasks.js
│       ├── team.js
│       ├── library.js
│       ├── profile.js
│       └── ...           # one file per resource
├── scripts/
│   ├── migrate-schema.sh # pg_dump from Supabase → schema.sql
│   ├── migrate-data.js   # row-by-row Supabase → RDS copy
│   └── apply-schema.sh   # psql schema.sql into RDS
├── schema.sql            # Canonical RDS schema (generated, committed)
└── package.json
```

## Environment variables (Amplify Console → Environment variables)

| Name | Purpose |
|---|---|
| `DB_HOST` | RDS endpoint |
| `DB_PORT` | usually 5432 |
| `DB_NAME` | database name |
| `DB_USER` | RDS user |
| `DB_PASSWORD` | RDS password |
| `DB_SSL` | `true` (required on RDS) |
| `SUPABASE_URL` | https://gclsgkhtwqurniitfeir.supabase.co |
| `SUPABASE_JWKS_URL` | `${SUPABASE_URL}/auth/v1/.well-known/jwks.json` |
| `SUPABASE_JWT_AUDIENCE` | `authenticated` |
| `CORS_ORIGIN` | `https://app.intorza.com` (comma-separated for multiple) |

## Local dev

```bash
cd backend
npm install
cp .env.example .env   # fill in
npm run dev            # http://localhost:4000
```

## Deploy to Amplify

See `../DEPLOYMENT.md`.

# Floor plan database rollout — 2026-10-15

Applied migration `20261015160000_floor_plan_quotation_builder` to the existing
CLI-linked project `gclsgkhtwqurniitfeir` with the user's authorization.

The live migration history has older remote timestamps that differ from local
filenames. A blanket `db push` was not used, and no historical migrations were
replayed or marked applied without execution. The floor plan SQL and its exact
`supabase_migrations.schema_migrations` entry were committed in one transaction
through the CLI's linked SQL query command. PostgREST received a schema reload.
The older `20261015120000` warranty/audit migration remains pending and was not
required for the floor plan tables.

Before applying, the migration and synthetic permission tests were executed in
a rollback-only transaction. Supabase's live default ACL grants browser roles
table administration permissions, so the new migration resets all PUBLIC/anon/
authenticated table grants and then grants authenticated SELECT/INSERT/UPDATE/DELETE.
This correction was made before the migration was deployed.

Post-deployment verification confirmed:

- `quotation_plan_projects` and `quotation_approved_rates` exist with RLS enabled.
- Anonymous table access and browser TRUNCATE/REFERENCES/TRIGGER grants are absent.
- Five owner policies cover the tables and storage operations.
- `quotation-floor-plans` is private; size limit 10,485,760 bytes; PDF/JPEG/PNG/WEBP allowed.
- Owners can insert/read their plan records, prices and storage objects.
- Other authenticated users cannot read/change another owner's plans, read/delete
  their prices, read/upload their plan objects, or forge the owner of a new plan.
- Linking a plan to another user's quotation is rejected.

All synthetic records were rolled back. Existing customer records were not modified.
Checks are in `supabase/checks/floor-plan-isolation.sql` (transaction required) and
`supabase/checks/floor-plan-status.sql` (read-only). Live AI model access and document
accuracy are separate from this database verification.

# Quotation versions

Quotation cards link to `/quotations/[id]`, including drafts. The existing Edit,
Duplicate and Delete buttons keep their own actions. The detail page's Versions
button opens a compact list of saved versions and recent changes. Tapping an
entry expands its before/after changes and revert action, without showing the
whole quotation. When tiers exist, a selector switches the history to that tier;
it defaults to the option currently being viewed. Switching clears selection,
confirmation and cached snapshots. Delayed responses from the previous tier are
ignored, and reverts always target the selected tier.

Apply `supabase/migrations/20261116120000_quotation_versions.sql` before releasing
the frontend. It depends on the existing quotation save, specifications and
reference migrations. Existing quotations receive their current state as Version
1 at migration time; edits before that point cannot be recovered.

Each successful `save_quotation` records a complete, database-built snapshot in
the same transaction. This includes the `save_ai_quotation` path, which delegates
to that function. Failed saves leave no history entry. Reverting uses the normal
save and adds a new version; previous versions remain available. Unchanged saves
are recorded too. Database IDs and creation timestamps are not content changes.

Snapshots contain saved quotation fields, ordered rooms/items, structured
specifications, measurement units, legacy depth/notes and ordered gallery image
references. They do not freeze account-wide company branding, PDF preferences,
library templates or image bytes. Deleting an image from the gallery can prevent
restoring a version that references it; the restore then fails atomically.

Version reads are protected by quotation ownership RLS. Clients cannot insert,
edit or delete snapshots. The capture function accepts only a quotation ID and
reads the actual database state after checking ownership. Reverts lock the parent
quotation and check the latest version number to reject a stale request. The
quotation's ID and reference number remain unchanged. Linked invoices are not
rewritten by a quotation revert. Direct status changes outside the quotation save
flow are not separately versioned.

Verification:

- `npm test -- --runTestsByPath src/lib/quotationVersions.test.ts src/lib/api.quotationVersions.test.ts src/components/quotation/QuotationVersions.test.tsx`
- `npm run typecheck`
- Run `supabase/checks/quotation-versions.sql` against a migrated test database.
  It uses synthetic users and rolls back its records. It checks complete restore,
  preserved history, rollback, stale-request rejection and tenant isolation.

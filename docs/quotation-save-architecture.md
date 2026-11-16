# Quotation data and save architecture

Implemented on 16 November 2026. Production migration and frontend deployment are
separate release steps. This follows the findings in
[the performance audit](performance-audit-2026-11-16.md).

## Foreground contract

The editor calls `get_quotation_editor(id)` once to fetch the quotation, ordered
rooms/items, gallery references, saved revision, original tier reference, and AI
provenance. Every read is authorized against `auth.uid()`. It replaces the previous
room-by-room request waterfall.

Saving calls `save_quotation_checked(id, payload, request_id, expected_version,
project_id)` once. The server validates ownership, locks the quotation group,
rejects an outdated editor version, and delegates to the existing validated
transactional save. Quotation rows, rooms, items, gallery references, immutable
history, AI identity mappings, retry receipt, and optional-work job commit together.
The response contains the canonical saved items and version, eliminating a separate
read-back. The browser still checks returned item values before replacing local IDs.
A newly created quotation adopts its saved URL without loading that editor again.
Initial editor loading waits for authentication to finish.

Each logical request uses a UUID. Retrying an uncertain response with the same
UUID and content returns the original immutable saved revision, without another
quotation or version. Reusing the UUID with different content fails. A deleted
quotation leaves a receipt tombstone so retries cannot recreate it. Receipts store
identities and a payload hash rather than duplicating the snapshot.

`QuotationSaveSession` retains uncertain requests and known ID mappings while the
editor is mounted. If the user makes more edits after a lost response, it first
confirms that request and then updates the acknowledged quotation. Consecutive
uncertain saves preserve the canonical item identities. Resetting/switching the
editor invalidates an old in-flight acknowledgement. This is not an offline editor:
pending requests are not persisted across a browser refresh. Legacy API methods
remain for existing duplicate/create callers; revision checks apply to the new
checked editor save contract.

## Secondary processing

Template auto-save is a durable PostgreSQL outbox job, coalesced to the latest
saved version per quotation. Its failure cannot roll back an acknowledged save.
Processing uses bounded batches, `FOR UPDATE SKIP LOCKED`, owner isolation, and
retry backoff. Structured specifications are preserved in reusable templates.
Indexes support owner/due-time queue scans and receipt cleanup on quotation deletion.

The mounted `QuotationJobProcessor` delivers jobs on login, reconnect, and save
notifications. It retries errors without blocking editor UI and stops when the
account changes or the component unmounts. Closing the app leaves the durable job
for the next signed-in session. No always-running server scheduler has been
configured by this change. An unattended queue worker would require a separately
authorized server-side scheduler and protected execution contract.
Only checked-save notifications trigger immediate queue delivery; ordinary status,
rename and delete cache invalidations do not poll an empty queue.

## Reads and rendering

- Profile/localization queries share one owner-keyed React Query entry, with a
  60-second stale window and request cancellation. Account switches cannot reuse
  another account's entry; obsolete account entries are removed.
- Quotation list and tier metadata use owner-keyed 30-second caches. Writes
  invalidate their corresponding account entries. Cached tier switches avoid
  resetting the whole page into a loading screen.
- Tier metadata contains totals/counts without full item snapshots. Full tier
  contents load when comparison is requested; exports continue to load their
  requested option. Late comparison responses are discarded after closing or
  changing the dialog.
- Version history downloads only the visible page plus its preceding snapshot in
  one bounded, quotation-scoped batch instead of separate requests per snapshot.
- PDF preview and generation load on demand. Completed collapsed item cards
  defer editor mounting until first opened, then keep input state across collapse.
  Product suggestion filtering waits until the dropdown is open.
- Mobile navigation closes its drawer when the route changes.

## Verification

Production-build browser checks used synthetic sessions and 6/72-item quotations.
All Supabase calls were intercepted locally; no customer account or production
write was used. Baseline was the deployed frontend; the optimized build ran on
localhost. These are request/asset comparisons, not equivalent network-latency
benchmarks or real-device speed guarantees.

| Initial 72-item editor | Deployed baseline | Optimized local build |
| --- | ---: | ---: |
| Intercepted account requests | 192 | 23 |
| Auth user requests | 80 | 3 |
| Profile requests | 81 | 3 |
| Per-room item-list requests | 12 | 0 |
| Complete editor RPCs | 0 | 1 |
| Initial decoded JavaScript | 2,393 KiB | 1,784 KiB |
| Drawer remains open after navigation | Yes | No |

Across repeat optimized runs, request counts stayed between 21 and 23 for 6/72-item
editors; the variation came from auth/wallet lifecycle timing, not room count. Remaining
profile/auth requests include separate subscription/account checks. No blanket
cache replaces server authorization or subscription enforcement.

TypeScript and the production Next build passed. Database checks run against an
isolated PostgreSQL 15 instance:

- `supabase/checks/quotation-data-contract.sql`: canonical saved identity,
  duplicate requests, changed-content rejection, stale edits, rollback, metadata,
  template updates/specifications, AI mapping, deletion tombstones, private helper
  privileges, and cross-account denial. All synthetic data rolls back.
- `supabase/checks/quotation-post-save-retry.sql`: deliberate optional template
  failure, preserved quotation/history, backoff, and recovery. Run only in an
  isolated test database; its temporary failure constraint rolls back.
- Jest coverage includes 72 observers sharing one profile request, account
  switching, lost and incomplete responses, consecutive retries with newer edits,
  background delivery/retry, lazy item input preservation, and tier navigation.

The broad Jest run passed 107 suites / 704 tests with the already failing,
separately modified `FloorPlanQuotationBuilder.test.tsx` excluded. That suite
requires a subscription-provider fixture and was left unchanged. Additional
save-session regression checks cover editor reset and overlapping requests.
`node scripts/check-quotation-save-browser.mjs` passed against the local production
build with all account traffic mocked. It checks an uncertain creation retry,
identical request reuse, no post-creation editor fetch, the next save updating the
acknowledged ID/version, and no browser runtime errors. Mobile drawer routing was
also rechecked successfully.
The new standalone modules pass ESLint; existing view files still contain older
lint violations, so this is not a claim that repository-wide lint is clean.

## Release order

1. Apply `20261116160000_quotation_data_contract.sql` before deploying the frontend.
   It adds tables/functions/indexes and reloads the API schema; it does not rewrite
   existing quotation data. Existing save RPCs remain compatible.
2. Run the integration checks and confirm the new owner-scoped RPCs are available.
3. Deploy the frontend and verify actual signed-in create/edit/retry, tier
   comparison, version restore, PDF export, and logout/account switching.
4. Observe save errors, conflict rates, queue attempts/age, and real-device p95
   navigation/save latency. A full restore/retention policy and autonomous server
   worker are operational follow-ups, not implied by this migration.

Receipts currently live for the account lifetime. Define a supported retry window
before adding retention: deleting receipts prematurely breaks retry guarantees.

Release database verification: migration `20261116160000` was installed on the
linked production project before pushing the frontend. The migration record,
indexes, owner-only table security and private-function grants were checked.
Production smoke checks exercised owner/input guards in a read-only transaction;
save/rollback/retry experiments used the isolated local database. Customer
quotation records were not changed by the release verification.

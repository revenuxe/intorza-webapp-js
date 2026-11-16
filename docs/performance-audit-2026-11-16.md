# Navigation and quotation performance audit

Date: 16 November 2026. This is an investigation, not an optimization release.
No application code, production records or schema were changed during the audit.

## What was measured

The production frontend at `app.intorza.com` was inspected in a headless Chromium
browser with a 390 × 844 viewport. A synthetic session and quotation were used;
all Supabase HTTP requests were intercepted and fulfilled locally, and Supabase
WebSockets were closed. No real account session or customer API data was used.
Analytics requests were blocked. This measures frontend request behavior, not
real authenticated network latency or the user's phone performance.

| Synthetic editor | Rooms | Items | Auth user requests | Profile requests | Item-list requests | Total intercepted account requests |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Small quotation | 1 | 6 | 14 | 15 | 1 | 49 |
| Larger quotation | 12 | 72 | 80 | 81 | 12 | 192 |

Both cases loaded 32 JavaScript resources totaling about 2,393 KiB decoded, before
opening PDF preview. This is uncompressed resource size, not wire-transfer size.
The cold and subsequent browser runs used different asset-cache conditions, so
their elapsed editor-load times are deliberately not compared.

A follow-up mobile navigation test clicked My Quotations from the navigation
drawer. The URL changed to `/quotations`, while the drawer remained visible.

Separate unauthenticated HTTP samples from this execution environment:

| Page | First headers received | Second headers received |
| --- | ---: | ---: |
| Create quotation `/` | 1,376 ms | 110 ms |
| `/quotations` | 1,313 ms | 970 ms |
| `/library` | 776 ms | 62 ms |

These are two samples per route, including connection/network overhead, without
device/network throttling. They are not a server-CPU benchmark or a user's p95.
They show variable page-delivery latency, but do not identify its cause.

Read-only production aggregates: 161 quotation records, 158 original groups,
maximum 25 rooms in a quotation, maximum 72 items in a quotation, maximum four
tiers in a group, and 167 version snapshots. Average stored snapshot size was
about 2,520 bytes, which may reflect database compression and is not JSON transfer
size. Record count is not evidence that this database is overloaded.

## Confirmed bottlenecks

### 1. Localization creates a request storm

`ProductNameInput.tsx:33` calls `useLocalization()` for every item.
`useLocalization.tsx:64` independently calls `profileApi.get()` for each hook
instance. `api.ts:87` first validates the user through `getUser()`, then fetches
the full profile. There is no shared localization provider or deduplicated query.

The browser measurements scale by exactly one additional auth request and one
profile request per added item: 66 additional items produced 66 more of each.
Navigation, the global paywall, tier controls and other components add their own
localization loads. This is the highest-confidence, highest-priority issue.

### 2. Collapsed item cards still mount all their editors

`QuotationItemCard.tsx:32` uses `hidden={!open}` while always rendering its
children. Collapsing a card hides its DOM but keeps its React components, effects,
localization requests and suggestion filtering alive. The synthetic cards began
collapsed, yet all item-level requests still occurred.

Any lazy-mount change must preserve unsaved controlled item state, keyboard focus
and the existing collapse behavior; simply unmounting arbitrary inputs is not a
complete fix.

### 3. Quotation editing has a serial room-loading chain

`CreateQuotation.tsx:loadQuotation` fetches the quotation, optionally its parent
reference, its sections, then awaits an item query inside a loop for every room.
Only after that does it fetch image links and AI provenance. The blocking loading
overlay stays until that whole sequence finishes.

For R nonempty rooms this is approximately R + 4 sequential request stages, plus
one for a child tier's parent reference. A 25-room quotation can therefore require
about 29–30 stages. As an illustration, 250 ms per stage would consume more than
seven seconds; that is a calculation, not a measured user load time.

The existing nested relation query can fetch sections with items together. Image
links can be batched, as they already are in this path. Optional AI reference data
should not unnecessarily delay the usable editor.

### 4. Mobile navigation does not close its drawer

`Header.tsx:57` creates an uncontrolled Sheet. Its Navigation links change routes,
but no navigation callback or pathname effect closes the Sheet. The browser test
confirmed this on the production frontend. The new page is obscured by the old
menu, creating a perceived navigation failure as well as unnecessary friction.

### 5. Tier navigation refetches complete group snapshots

`QuotationDetail.tsx:105` fetches the tier group, then fetches the selected quote.
`get_quotation_tiers` includes complete item/specification/image-reference
snapshots for every tier. Changing the tier query parameter repeats this load
and puts the page back into its loading state, even when that group was just
fetched. Comparison data is fetched before the user asks to compare anything.

Some recently added tier/version functionality therefore contributes avoidable
work. Lightweight tier metadata and cached group data should serve switching;
full comparison content can be requested when needed.

### 6. Save completion waits for optional work

`CreateQuotation.tsx:handleSaveQuotation` saves atomically, reads the quotation
back, may reconcile AI provenance, then checks and writes an automatic template.
The saving state is cleared only at the end. Optional template work is described
as silent but is still awaited in the foreground.

Save & Send additionally refreshes company/template data and generates a PDF.
These stages should be represented separately. Required save verification and
identity reconciliation must remain intact; optional template work should not
extend the save lock unnecessarily.

### 7. Repeated visits do not reuse most fetched data

The root has a React Query client with a 30-second stale time, but the investigated
screens use their own effects and direct Supabase calls instead of `useQuery`.
The source search found no `useQuery(` calls. Quotes refetch the complete list
on mount; profile/localization/template data is repeatedly loaded by independent
consumers. The library maintains a device cache, but mounts still reload account
entries and then legacy usage rows in separate pagination sequences.

### 8. The editor loads substantial optional code

`CreateQuotation.tsx:23` statically imports the PDF generator, and line 29 imports
the preview editor. The generator imports jsPDF and autotable. The product model
imports the 800-product catalog. PDF.js rendering itself already has a dynamic
wrapper, so it should not be described as entirely eager.

The decoded JavaScript total was measured; the exact byte contribution of each
dependency was not bundle-analyzed. Moving PDF generation and preview UI behind
their actual actions is a clear split opportunity to verify with before/after
bundle and mobile CPU measurements.

## Additional code-based risks

- Every item edit updates top-level section state. Item cards/field groups are
  not isolated with stable props, so larger forms repeatedly render many fields.
- Each rate keystroke also calls the library remember handler. Library commits
  synchronously serialize browser storage and dispatch a change event; readers
  parse and validate saved overrides, rebuild suggestions and potentially
  refilter them in every mounted product input. CPU cost needs a real-device
  input trace, but the synchronous work is present in the code.
- A version list can fetch a page plus its preceding snapshot: up to 11 detail
  requests for ten visible versions. Each detail currently adds another auth
  call. The UI is concise, but its underlying data path is still chatty.
- Dashboard statistics request all quotations and payments, then request each
  again for this month and last month. Aggregated owner-scoped statistics would
  avoid transferring overlapping records.
- Account/team and subscription checks add initial gates. They must be preserved
  for correctness and security, while unnecessary duplicate checks can be shared.
- PDF preview rebuilds a document after a 350 ms debounce and waits on fresh terms
  when opened. This is intentional preview work, but it is not evidence of
  ordinary route navigation being slow.

## Recommended implementation order

1. Share account/localization data once per authenticated identity; deduplicate
   concurrent requests and clear correctly on logout/account switch. Retain RLS
   and server-side authorization. Close the mobile drawer on successful routing.
2. Replace the per-room loading loop with a nested/batched quotation load. Load
   independent resources in parallel and make nonessential data nonblocking.
3. Keep tier metadata in a short-lived, owner-scoped cache and switch the visible
   tier without blanking the entire page. Fetch comparison payloads on demand.
4. Lazy-load PDF generation/preview and other optional dialogs. Measure actual
   compressed bundle sizes, CPU parsing and time-to-interactive afterward.
5. Remove optional template work from the save-critical path while preserving
   transactional save/read-back guarantees and retryable background work.
6. Isolate item renders and coalesce library persistence without losing the final
   edit on blur/navigation. Avoid mounting expensive inactive editor subtrees.
7. Add lightweight version summaries and database-side dashboard aggregates.

Acceptance checks should include real signed-in timings on a representative phone,
cold and warm navigation, 6/30/72-item editors, account switching, offline/retry,
price learning and save correctness. Target one shared localization/profile load
per identity refresh rather than one per item, a bounded quotation-load request
count independent of room count, and a drawer that closes when navigation finishes.

The synthetic browser reproducer is retained locally at
`test-results/performance-audit.mjs` (ignored test artifact). Production inspection
was limited to public pages/assets and aggregate-only database reads.

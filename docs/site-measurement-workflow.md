# Site measurement workflow

Implemented locally, building on the mobile overflow fixes. Not deployed yet.

The previous flow mixed recording a site visit with billable work and quotation
creation. Rooms were already saved individually, but a second Save button appeared
to save them again. Photos were hidden inside Edit Room, and conversion used
invented square dimensions plus separate, partly unchecked database writes.

## User journey

1. **Site details:** start a named visit, optionally add the address and assign a
   team member. Continue directly to rooms. Creation uses a stable UUID so an
   uncertain response can be retried without another visit.
2. **Rooms & photos:** capture each space's width/length in feet and inches or
   decimal feet. See calculated floor area before saving. Height/notes are optional;
   photos are discoverable on each saved room card. Rooms save individually, while
   Finish visit records completion after validating the saved measurements.
3. **Quotation, optional:** keep the visit as a survey record or prepare a draft.
   Use floor-area pricing, a fixed room allowance, quantity pricing, or no prices.
   The draft opens in the existing quotation editor for work scope, units, taxes,
   discounts and sharing. An existing linked quotation opens instead of duplicating
   it. Later site edits do not silently change that quotation.

Staff capture assigned visits and return to their team dashboard; company owners
create quotations. Clear status labels and next-action hints replace raw draft/
completed/converted labels. The list explains the process without forcing a
walkthrough on returning users. Unassigned visits are excluded from Assigned to Me.

Floor measurements are explicitly distinguished from cabinet or wall quantities.
Work items such as wardrobes/TV units are no longer offered as room presets, while
existing custom entries remain editable. Site photos remain with the visit; they
are not copied automatically into quotation PDFs.

## Save behavior

- Unsaved room changes need confirmation before closing; uploaded photos are
  already saved and the confirmation explains this distinction.
- Room save errors keep the form and its stable UUID for retry. Invalid/negative
  dimensions and invalid inches are rejected, with visible feedback.
- Visit completion uses an authenticated, RLS-respecting transaction and requires
  at least one room with positive finite dimensions. Photos/prices are not required.
- Conversion locks the owner visit, checks the room list and expected dimensions,
  and atomically saves pricing, the complete quotation/version/outbox job and the
  link. Failure rolls back all of them. One visit links to one current quotation.
- Real width/length are retained. Quantity items use Nos and fixed allowances use
  L.S. with quantity 1, so reopening a quotation preserves its calculation basis.
- Load errors show Retry rather than a misleading empty record.
- Capture feedback appears inline so floating notifications cannot cover the
  mobile bottom actions. Room save/cancel actions remain reachable while scrolling.

## Verification and release

TypeScript and the production Next build pass. Focused tests cover feet/inches,
invalid measurements, pricing arithmetic, room retry IDs, discard confirmation and
the atomic conversion UI. The broad Jest run passed 115 suites / 738 tests,
excluding the same pre-existing failing FloorPlanQuotationBuilder fixture.

`supabase/checks/site-measurement-workflow.sql` passed in isolated PostgreSQL 15.
It rolls back synthetic data and verifies completion, stale measurements, rollback
of partial pricing, correct geometry/units/totals, zero-price drafts, repeat
conversion, history/outbox creation, owner isolation and anonymous denial.

Browser checks use mocked account traffic and synthetic visits. Layout coverage
includes list/assignment, detail, room sheet, pricing and creation at 320, 360, 390,
503, 768 and 1280 pixels, including long unbroken names. No customer data was used.
`node scripts/check-site-measurement-browser.mjs` verifies the complete mobile
journey: create visit, capture 12 ft 6 in × 10 ft as 125 sq.ft, save one room,
discover its photos, complete the visit, create one priced draft and open it in the
quotation editor. Physical camera/storage uploads are outside this mocked check.

Database migration `20261116170000_site_measurement_workflow.sql` has been applied
and recorded on the linked production project after the existing quotation data
contract. It adds two authenticated RPCs without rewriting existing visit records.
Read-only production checks verified the grants, caller RLS and early input guards.
Frontend code is still local and has not been pushed/deployed. Real-device camera/upload behavior still needs a physical-device
smoke check; the existing private upload/signing implementation is retained.

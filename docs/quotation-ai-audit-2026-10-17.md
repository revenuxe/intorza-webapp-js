# Quotation AI audit — 17 October 2026

Scope: local source inspection and automated checks. No production database, uploaded PDF corpus, live provider response or current supplier price was inspected.

## Implemented follow-up: library-first estimates

The findings below describe the initial audit. Subsequent local implementation now:

- Paginates all owner-approved rates and usage/library records before matching, removing the 100/60-record caps.
- Uses recent explicit preferred prices from My Library (including imported quotations and finalized quotation usage) after approved business rates and before global reviewed PDF references or paid web research. Default-only usage records remain historical fallback. Country, age and specification checks still apply.
- Retains reviewed uploaded quotations as real price evidence: their comparable recent rates are reused unchanged, with source/range and uncertain inclusion/tax basis visible. New approved PDF records are retrieved on the next generation; no fine-tuning job is necessary.
- Adds a Modular interiors scope. Full Interior includes room-appropriate cabinetry, wall painting and false ceiling. Kitchen remains limited to detected kitchens. Recognized explicit painting/ceiling exclusions are respected by deterministic baseline coverage; other natural-language requirements remain model interpretations requiring review.
- Produces reproducible work-face dimensions from room dimensions and labelled allowances. Wardrobes use bounded front width × 7 ft; kitchen base/wall cabinets use estimated run × 2.5/1.5 ft; ceiling uses plan width × length. Painting uses room perimeter × assumed 10 ft height with no door/window deductions and excludes ceiling paint. These are editable estimating assumptions, not extracted site measurements.
- Displays width × height = sqft alongside rates in the estimate review, and preserves entered dimensions in both feet and metre completion flows (metres convert to feet).
- Preserves multi-sentence product specifications and includes the selected pricing specification and basis warnings in editor/PDF descriptions.
- Sends missing square-foot prices, including painting, to the existing source-backed web research engine. A failed/no-comparable research result remains pending rather than inventing a price. Per-piece and lump-sum services still require their separate billing workflow; they are never forced into sqft.
- Updates the existing learning records on finalized quotation saves; draft auto-saves no longer write their own unreviewed AI prices back into preferred rates.

Deployed to the existing Cloudflare worker `intorza-webapp-js`, version `e3ae3043-a40a-498c-8b48-b1bf67f4bcc0`, on 17 October 2026. Production build passed. On `https://app.intorza.com`, the home and quotations pages returned HTTP 200 and the published BUILD_ID matched the local production build. The AI endpoint returned HTTP 405 for GET and HTTP 401 for an unauthenticated generation POST, as expected. The apex `intorza.com` serves a separate site.

114 relevant automated tests and TypeScript passed before deployment. Automated tests use mocked database/provider responses; these and the HTTP checks do not establish authenticated provider access, uploaded-library coverage or live rate accuracy. Existing previously collected library preferences have no per-record review provenance beyond their library fields; review them in My Library if necessary.

## Current architecture

1. `floor-plan-provider.ts` sends plan images/PDFs to the configured OpenAI vision model and validates structured output. Only printed dimensions survive analysis normalization; unclear measurements remain missing.
2. `floor-plan/route.ts` loads business-approved rates, recent business usage patterns and the admin-reviewed global price catalogue. Reference rows are paginated across the complete catalogue before filtering by city. Approved business rates and history are limited to 100 and 60 rows respectively.
3. Generation proposes scope and reference IDs. Application code selects rates and computes totals; the model cannot directly set quotation totals.
4. Pricing prefers approved rates and reviewed references, then attempts market research for unmatched items, with labelled historical fallback. References can be indicative: the route passes `allowIndicative=true`, allowing uncertain tax/installation basis with warnings. Such references are not guaranteed comparable installed, tax-exclusive market prices.
5. `domain.ts` calculates dimensions/area with four decimal places and money with two, using integer arithmetic. `toQuotation` supplies editor, save and PDF rows.

## What “learning” means today

Admin PDF extraction followed by explicit review publishes reusable product/specification/rate records. Recent reference medians/ranges and business usage patterns inform subsequent generation. This is retrieval, not a model weight update. There is no demonstrated evaluation loop proving that adding documents improves pricing accuracy. Corpus size alone does not establish coverage of the requested city, finish, material, units and date.

## Confirmed measurement defects corrected

- Explicit work dimensions were converted to area and discarded during generation and estimate completion. They now remain in dimension mode; shared calculation computes their area and amount.
- AI estimates forced an area-only editor/PDF layout even when detailed size columns were enabled. They now respect that display setting.
- Editing direct area could leave conflicting old dimensions on a saved row. Direct area now clears them.

For example: width 8 ft × height 7 ft = 56 sqft; at 1,200 per sqft the line amount is 67,200 before discount/tax. Decimal feet are required: 8 ft 6 in = 8.5 ft, not 8.6 ft. Cabinet front area is distinct from room floor area. An area-only estimate cannot establish a unique width/height; those fields must remain unknown until provided.

## Next implementation priorities

1. Add a pricing coverage report: uploaded/extracted/approved counts, recent usable rates, excluded records and reasons, and unmatched requested specifications. Inspect actual approved data to locate the dominant failure before changing retrieval rules.
2. Normalize a reviewed product specification: material, thickness, finish, hardware tier, unit, city, effective date, installation, transport and GST basis. Preserve fixed package/per-piece prices separately; never multiply them by sqft.
3. Separate a comparable installed selling rate from indicative references. Display source count, date, price range and basis warnings beside the selected rate before PDF confirmation. Resolve tax/installation uncertainty explicitly.
4. Record accepted user corrections as review candidates, including original proposal, final rate/measurement and reason. Publish approved corrections into retrieval; avoid automatically treating every draft edit as verified training data.
5. Build a held-out benchmark of reviewed real plans and quotations. Measure room/scope recall, dimension extraction, unit correctness, comparable-rate coverage and error against expert rates. Split by project/document to prevent the same quotation appearing in both reference and evaluation sets.
6. Retrieve owner rates/history by requested product/specification rather than arbitrary capped lists. Evaluate matching changes against the benchmark, including material conflicts and stale/locality mismatches.

These are proposed follow-ups, not claims of deployed learning or verified market accuracy. Fine-tuning should be considered only after measuring errors that normalized retrieval and deterministic calculations cannot resolve.

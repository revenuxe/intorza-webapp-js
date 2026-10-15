# Admin AI → Train AI

The existing `/admin/dashboard` now includes an AI tab with a Train AI reference
library. This is retrieval of reviewed quotation knowledge, not fine-tuning or
automatic model training. No new model/API credential is required.

## Flow

1. Sign in with an account recognized by the existing `is_admin()` function.
2. Open AI and upload one PDF (maximum 10 MB). Server authentication and admin checks
   run before storage, inference or reading extraction records. The PDF is signature
   checked, hashed for duplicate detection, and stored in a private admin-only bucket.
3. The configured vision model extracts section titles, product/material specifications,
   billing units, explicit printed unit rates/quantities, source pages, city, currency,
   price date, tax/inclusion indicators and limitations. It is instructed to exclude
   customer names, addresses, contacts, company/payment identifiers and other private
   details. Missing rates stay null; totals are not treated as unit rates.
4. Review and correct the entries, remove inappropriate patterns and confirm anonymization
   and global reuse. Original PDFs/extraction drafts remain admin-only. Only reviewed
   product/pricing fields are published to the global reference table.
5. Approval and rejection use a transaction-backed RPC. Reapproval replaces previous
   patterns atomically. Reject / unpublish removes that document's published patterns
   from future generation, while preserving the private source review record.

## Quotation integration

The server retrieves only published global patterns for the project city/currency.
They guide section/product/material descriptions without copying source quantities
or customer details into a new quotation. Tenant-specific approved selling rates
retain priority. Recent (90-day), non-future, installed, tax-exclusive sqft/sqm reference
rates may then be selected. Sqm rates normalize to sqft; other units can guide naming
but do not get forced into square-foot billing. Market research handles missing prices,
then recent business history remains a labelled fallback. Source page/date and
`admin_reference` provenance distinguish uploaded references from live supplier prices.

Published information is available to signed-in quotation users by design. Raw PDFs,
filenames, source extraction drafts, uploader identity and document review records
are never included in the generation context. Admin review is required because model
redaction alone cannot guarantee that a specification is free of private information.

## Deployment and verification

Migration `20261015180000_admin_ai_training.sql` was applied to the existing linked
Supabase project on 2026-10-15, with its exact SQL recorded in the migration ledger.
Historical migration mismatches were left untouched. Tables use RLS and explicit
SELECT/INSERT/UPDATE/DELETE grants; anonymous and browser administration privileges
are excluded. The storage bucket is `ai-training-quotations` (private, PDF, 10 MB).

Uses existing Cloudflare `OPENAI_API_KEY`, `OPENAI_FLOOR_PLAN_MODEL`/`OPENAI_MODEL`
and `QUOTATION_AI_LIMITER` settings. The existing `is_admin()` authorization and Worker
entry point are reused. HTTP interface: `/api/admin/ai/training` GET lists private
admin records; POST uploads or reviews a record. No service-role key reaches the browser.

Tests cover absent/non-admin authentication, rate limits, bad PDFs, duplicate uploads,
failed-analysis cleanup, no automatic publication, explicit anonymized review, edit
confirmation reset, and generation using approved references before market research.
Live database rollback tests additionally cover admin access, customer denial on raw
records/files, read-only approved references, forbidden customer publication and rate
edits, and unpublishing. No synthetic records remain. Live PDF extraction accuracy and
provider account access remain deployment smoke-test items; mocked inference is not
presented as a live model test.

The mobile browser regression test exercises Admin Dashboard → AI, PDF submission,
correction and required review acknowledgement before publication, with no overflow
inside the training panel. Provider and authentication responses are mocked there.

Current library listing is limited to the latest 50 uploads. Source deletion/retention
automation and bulk ingestion are not implemented. Rejecting stops future reuse; it
does not alter existing saved quotations or delete the original private source PDF.

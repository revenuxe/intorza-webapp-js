# Application structure review — 14 October 2026

## Current boundaries

| Area | Implementation | Persistence / access |
| --- | --- | --- |
| Routes and navigation | `src/app`, `src/lib/navigation.tsx` | Next App Router, protected workspace layout, separate admin/team entry points |
| Feature screens | `src/views` | Supabase client calls and `src/lib/api.ts` |
| Quotations | CreateQuotation / QuotationDetail | `save_quotation` transaction owns header, sections, items, gallery references |
| Document terms | My Library / `libraryDefaults.ts` / `termsResolver.ts` | User-owned, document-type-specific `terms_templates`; transactional `select_terms_template` |
| PDF output | PDFPreviewEditor / pdfGenerator; InvoicePreviewEditor / invoiceLayouts | Shared resolved terms for preview and download, editable per preview |
| Branding | Settings / `storageUpload.ts` | Unique company-logos object; profile reference saved afterward; failed reference save removes new object |
| Photos | Gallery / RoomFormSheet | gallery-images public; room-photos private with freshly signed URLs |
| Deployment | OpenNext / wrangler.jsonc | Cloudflare Worker and static assets; no application AWS/S3 integration |

## Fixes in this change

- Settings upload buttons now open the file picker. Inputs reset after success/failure, allowing the same logo to be selected again. Profile state updates preserve changes made during upload.
- Uploads accept known image extensions when the browser supplies no MIME metadata and normalize `image/jpg`. SVG logos must rasterize to PNG before storage; raw SVG is never stored. WebP transparency is retained when rasterizing.
- Selecting a terms default enables it and clears the previous default for that user and document type in one transaction. Enabling a template selects it, matching the UI promise. Cross-account selection is denied.
- Preview/download wait for terms loading. Failed library queries produce an error instead of silently substituting generic legal text.
- Explicitly disabling every library terms template yields no terms; quotation and invoice renderers honor the empty list. Generic terms remain the initial fallback for accounts without templates and anonymous previews.
- Tests cover file metadata, failed database-reference cleanup, actual preview/download PDF text, repeated logo selection, and transactional selection with tenant isolation.

## Findings requiring further work

1. **Profile privacy:** the live policy `Anyone can view company names` has `USING (true)` for the entire profiles table. This is a row policy, not a company-name column restriction. TeamSignup currently queries company directory fields from profiles, so deleting the policy alone would break company discovery. Replace that query with a narrowly scoped company-directory RPC/view, verify team onboarding, then remove the broad profile policy.
2. **Room-photo isolation:** the bucket is private, but existing storage policies permit bucket-wide SELECT/INSERT/DELETE. Private buckets alone do not establish tenant isolation. Replace these policies with owner-prefix checks plus explicitly authorized project/team access. Existing legacy object paths and team workflows need coverage before enforcement.
3. **Schema history:** old local/remote migration versions drift. Deploy only individually reviewed additive migrations until an authoritative baseline is reconciled. Do not replay the whole local migration folder against production.
4. **Library import:** MyLibrary imports old profile templates in the browser, with a localStorage marker and nontransactional writes. Move this one-time import to an idempotent database migration/RPC; browser-local flags are not a durable migration ledger.
5. **Issued-document history:** terms are resolved from the current library when generating a PDF. Quotations do not yet store immutable issued-document terms/version snapshots. Editing the library can therefore change a later re-download. Add an explicit issuance/version model if historical agreements must remain reproducible.
6. **Data access consistency:** some feature screens still query Supabase directly while others use api.ts. Consolidate feature-level repositories incrementally, retaining RLS and testing actual ownership rules rather than attempting a global mechanical rewrite.
7. **Payment webhook:** the earlier integration review found missing RAZORPAY_WEBHOOK_SECRET. Keep the hardened webhook deployment gated on provisioning that secret and checking signature validation.

## Evidence and limits

The live review inspected schema, bucket configuration, and access-policy metadata without reading customer records. All public application tables have RLS enabled; this does not imply every policy is correctly scoped, as the findings above demonstrate. Required terms columns exist, and logo bucket policies match the uploader's user-ID prefix. No bucket size/MIME restriction was found that would explain the logo problem.

`supabase/checks/terms-selection.sql` creates synthetic data and rolls back all writes. It verifies enabling selection, clearing the old default, preserving the invoice default, and denying cross-tenant selection. Browser tests intercept Supabase/payment requests; they verify app wiring and actual generated PDF text without changing customer data. They do not replace a signed-in smoke test against production storage.

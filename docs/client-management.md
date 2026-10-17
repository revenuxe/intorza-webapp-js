# Client details and deletion

Client cards open a responsive detail dialog showing saved contact information,
quotations, invoices and balances. Document links open the quotation or invoice;
invoice details include payment history. Cards report quotation/invoice counts
rather than incorrectly calling every quotation a project.

Grouping uses client IDs. A name-only legacy document joins a saved client only
when that name identifies one saved client. Duplicate names with different IDs
remain separate; unresolved client IDs cannot be deleted from this view.

Delete client shows the exact quotation and invoice list and requires typing
DELETE. `delete_client_records` checks authenticated Pro access and ownership,
compares the submitted IDs with the current client records, then deletes the
client profile, quotations and invoices in one transaction. Existing cascades
remove quotation items/sections, invoice payments and quotation team assignments.
Changed previews fail without deleting anything. Invoice membership respects
explicit client IDs before quotation links before legacy names.

Standalone projects/tasks, templates, shared library assets and stored floor-plan
uploads are outside this deletion action; existing quotation references use
their configured foreign-key behavior. This is not a full storage-erasure tool.

Migration: `20261017190000_delete_client_records.sql`, applied independently and
recorded with its original SQL in the linked migration ledger.

Validation: six grouping/UI tests; TypeScript and production build; browser checks
at 320px, 390px and 1440px including typed confirmation and exact RPC payload.
`supabase/checks/client-record-deletion.sql` verifies cascade deletion, stale
preview rejection, legacy records, Pro checks and cross-owner isolation using
synthetic fixtures in a rolled-back transaction. No real clients were deleted.

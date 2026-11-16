# Quotation tiers

Apply `20261116120000_quotation_versions.sql`, then
`20261116130000_quotation_tiers.sql` before releasing this frontend.

From a quotation detail page, Tier first asks for the original option's name:
Basic, Standard, Luxury, or a custom name of up to 40 characters. Naming an option
does not change its pricing. Names are unique within the quotation, ignoring case
and surrounding whitespace.

Create another tier copies the selected tier's current saved rooms, items,
specifications, quantities, rates, totals and gallery links atomically, then opens
the copy in the editor. It starts as a draft. A copy has independent item/room IDs
and independent version history. Copying a child keeps it in the original group.

My Quotations displays the original quotation once. Its detail page switches
between options using `/quotations/[root]?tier=[option]`. It validates that the
selected option belongs to that quotation. The original reference is displayed
on the detail page and exported tier PDFs; the PDF title identifies the option.
Underlying option records keep distinct IDs and database references so existing
PDF response links, invoices and version history target the chosen option.

Client ID, name and address are shared from the original quotation. Child editors
show those fields as read-only, with a link to edit the original. Database triggers
propagate original client edits and prevent stale child edits or child reverts
from replacing the shared client. Other project fields, content and prices are
specific to the selected tier. Reverting the original can restore its client
details and consequently updates the other options' shared client details.

The comparison shows items by room/item position, which aligns copied tiers even
when product names change. It shows descriptions/specifications, quantity, unit,
rate, line amounts, discounts, tax and totals. Missing items are marked Not
included. Options can be opened individually from the comparison.

PDF/Share exports the selected option. Supported devices open file sharing; other
devices download the PDF. This shares a file, without publishing the private
quotation detail page. Customer accept/reject links still target the selected
option's ID. Deleting the original quotation deletes its options and history;
the deletion confirmation states that scope.

Verification includes UI/API tests, TypeScript, the existing atomic-save and
version SQL checks, and `supabase/checks/quotation-tiers.sql` on an isolated local
PostgreSQL database. The tier SQL check rolls back synthetic records and checks
copying, independent edits/history, canonical clients, safe reverts, unique names,
tenant isolation and group deletion.

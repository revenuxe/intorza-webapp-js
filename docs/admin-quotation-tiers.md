# Admin quotations on mobile

Apply `20261116140000_admin_quotation_tiers.sql` after the quotation version/tier
migrations before deploying this frontend.

Dashboard tabs and billing tabs use horizontal tracks with arrow controls and
keyboard focus scrolling. Quotes uses mobile cards and retains a table on larger
screens. Both layouts expose an explicit Open/View quotation action.

The admin directory groups options under the original quotation. Search matches
the original and child tiers, including their tier names and references, then
returns each original once. Pagination and counts refer to quotation groups.
The amount/status in the directory belongs to the original; each option's own
amount/status is available in its detail view.

Open a quotation to inspect saved details in a read-only dialog. The tier selector
switches between the original and child options. It shows the selected option's
client/project fields, rooms, item descriptions/specifications, quantities,
dimensions, rates, line amounts, tax, discount, total and version count. Opening
a child ID resolves its group and selects that option initially.

`admin_quotation_detail` and the directory RPC both require `public.is_admin()`.
The detail RPC wraps the private snapshot helper; no owner-scoped customer RPC
or public quotation link is used to bypass ownership. Anonymous execution is
revoked. The view provides no admin editing/deletion/revert actions.

Checks: admin card/detail/scroller Jest suites, TypeScript, and
`supabase/checks/admin-quotation-tiers.sql` on a migrated test database. The SQL
check uses synthetic users, rolls back records, and verifies grouped searches,
per-tier content, admin inspection across accounts and non-admin denial.

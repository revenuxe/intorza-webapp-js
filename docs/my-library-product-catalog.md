# My Library product workspace

The Items tab at `/library` is public. Only this route was moved out of the
protected route group; other workspace routes retain their existing guards.
Other library tabs keep their existing behavior and subscription gates.

## Catalog and storage

`src/lib/library/master-catalog.json` is the versioned, read-only master catalog:
80 stable category IDs and 800 stable product IDs, ten per category. Names follow
the supplied catalog. Rates start unset in INR; specifications are optional and
no market prices are seeded. Count and identity tests prevent duplicate seeds.
The catalog is bundled with the page, so guests do not depend on a database fetch.

Browser storage keeps only personal differences and custom records, under
`intorza:product-library:v1:guest` or an account-specific key. Guests receive an
explicit browser/device-only notice. Browser data clearing removes these edits.
Storage failures are reported rather than silently claiming a successful save.

Authenticated changes sync to `library_personal_entries`, keyed by user and entry
ID, with separate product/category kinds. RLS denies anonymous reads and restricts
all authenticated operations to the owning user. A null payload resets an override
or removes an empty custom category. It does not remove the master catalog.
Only modified/default records and user-created records are stored, not 800 copies.

Edits write locally before cloud sync. Pending changes survive reload and sync
after reconnection/retry; acknowledgements clear only matching revisions so edits
made during an in-flight save remain pending. The account UI remounts when the
authenticated user changes. Existing `item_usage_patterns` are read and merged
with stable legacy IDs, preserving their prices without modifying those rows.

Guest import offers import, keep-account, and conflict review. Conflicting account
overrides are preserved unless explicitly selected for replacement. Imported IDs
remain stable across repeated imports. Browser copies remain on the device.

## Editing and performance

Expanded categories use responsive rows: a spreadsheet layout on wider screens
and labeled cards on phones/tablets. Rate/material/finish fields save on blur or
Enter. A bottom sheet handles full product details and the existing dynamic
specification editor. Invalid rates and incomplete numbers are rejected.

Search is debounced and matches names, descriptions, categories and specifications.
Categories are lazily expanded; editable rows mount only near the viewport and
large custom categories page in batches of 30. Bulk actions preview exactly the
selected records and reject percentages on unset rates without an explicit base.
Reset requires confirmation and affects only the selected master overrides.

## Scope and verification

No quotation calculations, PDF generation, authentication implementation, or
other application page was changed. Existing approved rate sources remain in the
Items tab using their prior localization settings. The quotation Product Name field reads the merged catalog and current account/device
overrides through a read-only suggestion adapter. Selecting a product fills only
blank details and rates, and applies its unit only to a pristine measurement row.
A rate is never applied across incompatible billing units. Existing saved quotations
are not automatically changed. The separate rate-learning system remains intact.

Verification includes catalog/unit/model/storage tests, sync/error/account-switch
tests, rollback-only SQL RLS checks, guest mobile browser flows, mocked account
import and failed-sync recovery, and a production Next.js build from an isolated
source copy excluding unrelated local edits.

Known limits: browser-only guest data is not cross-device storage; cloud sync
requires connectivity. Simultaneous edits to the same account entry on different
devices use the last successful cloud write. The master catalog supplies no
verified market rates, brands, or material promises.

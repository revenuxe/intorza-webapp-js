# Fix Terms in PDF Preview and Downloads

## Changes
- Pass the active quotation terms into the quotation preview instead of letting it use built-in sample terms.
- Load active invoice terms into the invoice preview, matching the downloaded invoice.
- Use built-in default terms only when no library template is enabled or usable.
- Keep the Terms & Conditions visibility setting respected.

## Verification
- Add focused tests for enabled-template selection and default fallback.
- Check quotation and invoice previews, downloaded PDF data paths, and the current build status.

## Technical details
- Centralize fallback terms in the library loader so preview and download consume the same resolved content.
- Refresh terms when each preview opens to avoid stale library state.

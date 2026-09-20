# Reliable Terms and High-End PDF Editor

## Goal
Make enabled My Library terms appear consistently in quotation and invoice previews and downloads, then replace the settings-heavy PDF screen with a polished structured editor that supports safe direct editing and drag-and-drop.

## Confirmed findings
- The current account’s quotation terms template is returned by Supabase with `is_enabled: false`, so the shared terms loader correctly falls back to built-in terms even if the switch previously appeared enabled.
- The quotation preview fetches library terms independently, while quotation downloads and invoice flows load and merge terms through different paths. This creates stale and inconsistent results.
- The existing preview renders completed PDF pages as images. It supports zoom, page navigation, lazy page rendering, and settings controls, but those images cannot provide true direct text editing or drag-and-drop.
- The current advanced controls adjust global values such as spacing, borders, columns, and font sizes; they do not maintain a reorderable document structure.

## Implementation

### 1. Make enabled terms reliable
- Create one terms resolver for quotation and invoice documents that returns the selected enabled template, its identity, loading status, and built-in fallback.
- Make enable/disable updates user-scoped and verify the returned saved row before showing success; restore the switch and show a clear error if persistence fails.
- Define deterministic selection: enabled default template first, otherwise the most recently updated usable enabled template; built-in defaults only when no usable template is enabled.
- Refresh/invalidate terms immediately after template changes and whenever an editor opens or a PDF download starts.
- Remove competing profile-term fallbacks from preview/download call sites so preview and export receive the same resolved terms snapshot.
- Show the active template name and fallback state in the editor, with a shortcut to manage terms.

### 2. Introduce a structured document model
- Represent each quotation/invoice as ordered blocks: header, client/project details, item sections, totals, payment schedule/history, terms, bank details, signature, and response area.
- Give blocks stable IDs and controlled settings for visibility, order, spacing, alignment, width, and page-break behavior.
- Keep terms on a dedicated page by default while allowing their internal sections and points to be reordered and edited safely.
- Use this same model as input for both the interactive preview and final jsPDF export, preventing preview/download differences.

### 3. Rebuild the editor workspace
- Desktop: compact left block navigator, central page canvas, and contextual right properties panel with a restrained SaaS-style toolbar.
- Mobile: full-width canvas with a bottom editing sheet, large touch targets, sticky page/zoom controls, and no cramped multi-column controls.
- Add select-on-canvas behavior, clear selected-block outlines, contextual actions, undo/redo, reset, duplicate where valid, visibility toggles, and autosave status.
- Replace the long generic theme lists with searchable presets, recent choices, brand controls, and focused properties for the selected block.

### 4. Structured drag-and-drop and direct editing
- Add accessible pointer, touch, and keyboard drag-and-drop for reordering document blocks and terms sections.
- Constrain drops to valid positions and show insertion guides; prevent overlaps and formatting-breaking free placement.
- Add inline editing for supported text such as headings, terms titles/points, notes, and labels, with explicit commit/cancel behavior.
- Add controlled resize/spacing handles for columns, logo, block width, and vertical spacing, using snap points and safe limits.
- Support keyboard movement, focus restoration, and screen-reader announcements for reorder operations.

### 5. Smooth rendering pipeline
- Update the editable HTML canvas immediately during interaction instead of regenerating the PDF on every input.
- Debounce a background PDF snapshot for export fidelity, cancel stale jobs, preserve the active page and scroll anchor, and retain the previous rendered page until its replacement is ready.
- Keep page virtualization and adjacent-page prefetching, but move the PDF image renderer to export-preview/validation duty rather than the primary editing surface.
- Show lightweight saving/rendering states without blocking editing.

### 6. Persistence and compatibility
- Save editor layouts per user and document type through the existing Supabase-backed data layer; keep document-specific overrides separate from reusable defaults.
- Migrate existing theme/editor settings into the structured model so current users retain their appearance.
- Keep existing quotation and invoice data, localization, pricing rules, and visibility controls intact.

## Verification
- Add resolver tests for enabled default selection, enabled recent selection, failed toggle persistence, unusable content, all-disabled fallback, and quotation/invoice separation.
- Add integration tests proving the exact active terms content reaches quotation preview/download and invoice preview/download.
- Add drag-and-drop, inline-edit, undo/redo, keyboard reorder, autosave, and preview/export parity tests.
- Extend the scroll regression test to edit on page 2 or 3 and verify the canvas never jumps to page 1.
- Test desktop and mobile layouts, touch dragging, long terms, multi-page terms, zoom/navigation, and slow rendering.
- Confirm a clean build and inspect generated quotation and invoice PDFs against the editor canvas.

## Technical details
- Use a shared typed document schema and renderer adapters rather than treating the generated PDF blob as the editable source.
- Use a proven accessible drag-and-drop package with pointer, touch, and keyboard sensors.
- Keep final downloads generated by jsPDF, driven by the same immutable document snapshot shown in the editor.
- No freeform absolute positioning in this phase; structured drag-and-drop preserves professional formatting and reliable pagination.

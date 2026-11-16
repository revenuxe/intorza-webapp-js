# Library pricing tiers

My Library → Items has a Basic / Standard / Luxury pricing selector. Existing
product rates and details remain Standard. Basic and Luxury variants are saved
under each personal product's optional `tierPrices` JSON, using the existing
account-scoped library storage and offline pending queue. No existing library
records are moved or quotation prices rewritten.

Rates, units, descriptions and specifications are separate per tier. An unset
Basic/Luxury rate is blank; it does not inherit a Standard price. A variant's
description/specifications start from Standard until customized. Names,
categories and archive state are shared. Inline edits, the product editor,
bulk edits, reset and quotation learning respect the active pricing mode.
Reset removes only that mode's overrides and retains other tier prices.

Selecting a quotation tier or editing a Basic/Luxury quotation switches library
suggestions and remembers the display mode for the next visit to My Library.
The editor also links directly to `/library?pricingTier=luxury` (or the matching
mode). Only the enum display preference is stored globally on the device;
account product data remains private. Custom quotation tier names use Standard
suggestions and keep copied prices when the custom tier is created.

Apply `20261116150000_library_tier_prices.sql` after the existing quotation tier
and personal-library migrations before deploying this frontend. The optional
variant JSON itself requires no table alteration. The new SQL helper reads only
the authenticated owner's rates. Tier creation flushes pending local library
entries to the account first; a failed sync aborts creation instead of silently
using stale prices.

When creating a new named Basic, Standard or Luxury tier:

- Copy the selected tier's current saved content in the existing transaction.
- Match personal library products by exact normalized product name and unit.
  Standard also supports existing account item-usage rates. Hidden products and
  categories, unset/invalid prices, unit mismatches and ambiguous matches are
  skipped. Explicit zero is a valid saved rate.
- Apply a uniquely matching saved rate and its tier description/specifications.
  Other items keep their copied rate and details.
- Recalculate line amounts, subtotal, the copied effective discount percentage,
  tax and total; save the new draft and its Version 1 atomically.

Opening, switching, renaming or editing an existing quotation never runs bulk
repricing. Existing saved quotations remain snapshots even when library rates
are later changed. The version-history UI continues to show additions/removals
only, as requested.

Tests cover UI pricing selection, per-tier storage, suggestions/learning,
pending-price sync and the rollback-only SQL check
`supabase/checks/library-tier-prices.sql` for atomic creation, fallback behavior,
zero prices, unit safety, duplicate names, account isolation and financial totals.

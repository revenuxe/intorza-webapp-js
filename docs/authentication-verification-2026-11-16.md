# Authentication verification — 16 November 2026

This follow-up verifies authentication and account isolation around the quotation
performance release. It does not replace server authorization with browser caches.

## Fixes

- Account changes remount the public quotation editor, clearing the previous
  account's client details, company profile, gallery selections, and pending save
  session. A token refresh for the same account keeps unsaved edits.
- Quotation automation exposes only the current account's preferences/clients,
  ignores late responses, and avoids reloading just because the user object was
  refreshed. Old-account learning work stops before its next write.
- Team dashboard routes now have an identity-keyed session boundary. Admin routes
  retain their existing server-backed role guard; logout clears its cached grant
  and a new login requires a new check. Late checks cannot authorize another user.
- Protected-route redirects still work if browser session storage is unavailable.
- Pro access expires in an open tab without polling the database. Invalid expiry
  values fail closed, and protected action callbacks check expiry at click time.
- Logout errors are surfaced. The installed Supabase SDK removes local sessions
  even when remote revocation fails; the application preserves that removal and
  reports that full sign-out could not be confirmed.
- Offline authentication checks keep the editor instead of starting an action or
  redirecting away. Authenticated actions require a successful user check.
- Stored drafts are parsed/validated before restoration. Missing or malformed
  drafts cannot trigger an empty automatic save. Valid drafts wait for session
  restoration and resume their action once.

## Verification

The production Next build and TypeScript checks passed. The broad Jest run passed
112 suites / 724 tests with the previously failing, separately modified
`FloorPlanQuotationBuilder.test.tsx` fixture excluded. New coverage includes
account-response races, logout errors, protected-route unmounts, admin grant
invalidation, stored-draft validation, offline actions and open-tab Pro expiry.

Local production-build browser checks use synthetic sessions and intercept every
Supabase HTTP/WebSocket request. They make no customer-account writes:

- `node scripts/check-auth-browser.mjs`: workspace/admin/team redirects,
  authenticated quotation access, missing-draft safeguards, remote logout failure,
  public editor clearing, successful cross-tab logout, and no runtime errors.
- `node scripts/check-quotation-save-browser.mjs`: lost-response request replay,
  no duplicate editor load after creation, next-save identity/revision, valid draft
  continuation, and no runtime errors.

`supabase/checks/authentication-readonly.sql` passed against the linked production
database. Its read-only transaction checks owner-table RLS, anonymous denial,
browser restrictions on entitlement columns, non-admin isolation, cross-account
record denial and quotation editor authorization. It does not return customer
records or change the database. This release requires no additional migration.

Live Google OAuth, CAPTCHA challenges, payment-provider flows and every physical
phone/network condition were not exercised with real credentials. Backend API/RLS
checks remain the authority for access; these checks are not a penetration-test
certification or a guarantee that every possible authentication failure is covered.

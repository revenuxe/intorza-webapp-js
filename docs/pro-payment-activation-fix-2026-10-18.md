# Pro payment activation repair

Checkout and provider verification charge INR 49900 (Rs. 499), but the original database activation function required 100 for both INR and USD. Every captured INR 49900 payment therefore failed activation. The transaction rolled back the payment log, profile upgrade, and subscription event together.

Applied migration 20261018090000_fix_pro_activation_currency_amount to linked production project gclsgkhtwqurniitfeir on October 18, 2026. Live verification confirmed both the migration record and INR 49900 validation. This replaces the function used by both checkout verification and the Razorpay webhook. No frontend deployment is required for this database correction. USD remains 100 cents.

Validation: run node scripts/prepare-security-check.mjs to build a transaction containing the migrations and regression checks, then execute the printed Supabase command. It rolls back all synthetic data and DDL. With migrations already deployed, use --current. Checks cover INR 49900 billing, USD 100 billing, wrong amounts/currencies, duplicate activation, cross-account replay, and refunds.

For existing affected payments, resend their payment.captured webhooks from Razorpay after applying the migration. Confirm captured status, original order ownership and purpose through the existing provider-backed handler. Processing the same payment more than once is safe. Confirm the user's profile has is_pro=true and payment_status=active, and payment_logs contains one captured activation record with the correct amount and currency. Do not ask users to pay again. Replaying successfully activates 30 days from processing time under the existing policy.

The live database correction is deployed. Past deliveries have not been replayed. Confirm recovery for each affected payment in Razorpay before declaring the incident resolved.

The admin_user_directory migration (20261018100000) is also applied and recorded. It restricts the directory to admins and separates Auth login email from the current company contact used on quotation PDFs. Rollback-only live checks passed for authorization, search, pagination and expired access. Dashboard source adds search, payment history and manual Pro controls; frontend deployment is still required.

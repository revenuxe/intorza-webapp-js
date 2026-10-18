# Admin billing structure

Billing contains Pro subscriptions and Coin wallets. Pro grant/revoke controls only appear under Pro subscriptions; coin adjustments only appear under Coin wallets. AI training contains the quotation training library and price catalogue. Overview contains the summary statistics, keeping account tools visible at the top of the page.

Billing defaults to recent captured Pro purchases first across the full directory before pagination. Accounts with no recorded Pro purchases follow paid accounts. An optional sort returns to newest accounts. Admin grants and coin purchases do not count as Pro purchases.

View payment history opens an accessible, scrollable dialog for the selected account. It fetches all payment log records in pages of 20, newest first, including failed attempts and refunds, with amount, currency, timestamp, payment/order IDs when present and provider reference. Coin wallets use Auth login emails, search and server pagination rather than a fixed 100-wallet list.

Migration 20261018110000_admin_billing_structure was applied and recorded in linked production project gclsgkhtwqurniitfeir on October 18, 2026. Rollback-only live checks passed for admin authorization, sorting, 23-record history pagination and wallet login identity. Existing directory calls remain supported through default arguments. Frontend changes require deployment.

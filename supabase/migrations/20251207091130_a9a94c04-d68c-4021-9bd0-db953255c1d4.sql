-- Add bank details columns to profiles table for payment information
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS bank_name text,
ADD COLUMN IF NOT EXISTS bank_account_number text,
ADD COLUMN IF NOT EXISTS bank_ifsc_code text,
ADD COLUMN IF NOT EXISTS bank_account_holder text,
ADD COLUMN IF NOT EXISTS upi_id text,
ADD COLUMN IF NOT EXISTS payment_qr_url text;
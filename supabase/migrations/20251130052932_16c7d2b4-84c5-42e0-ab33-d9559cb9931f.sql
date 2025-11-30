-- Add signature_url column for storing signature image
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS signature_url text;
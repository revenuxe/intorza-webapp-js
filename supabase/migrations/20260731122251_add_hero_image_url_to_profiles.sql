-- Hero banner invoice layout needs a full-width photo; store it on the profile
-- (account-global, same pattern as logo_url/signature_url) rather than per-invoice.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hero_image_url text;

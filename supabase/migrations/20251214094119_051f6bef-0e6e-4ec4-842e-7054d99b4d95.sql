-- Add country and localization fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS country_name TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS currency_code TEXT DEFAULT 'INR',
ADD COLUMN IF NOT EXISTS currency_symbol TEXT DEFAULT '₹',
ADD COLUMN IF NOT EXISTS measurement_system TEXT DEFAULT 'metric',
ADD COLUMN IF NOT EXISTS tax_label TEXT DEFAULT 'GST',
ADD COLUMN IF NOT EXISTS date_format TEXT DEFAULT 'DD/MM/YYYY',
ADD COLUMN IF NOT EXISTS number_format TEXT DEFAULT 'indian',
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Asia/Kolkata',
ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'en-IN';

-- Add country_code to library tables for country-aware filtering
ALTER TABLE public.item_usage_patterns
ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT NULL;

ALTER TABLE public.section_templates
ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT NULL;

ALTER TABLE public.payment_templates
ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT NULL;

ALTER TABLE public.terms_templates
ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT NULL;

ALTER TABLE public.bank_detail_templates
ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT NULL;

ALTER TABLE public.warranty_templates
ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT NULL;

-- Create index for faster country-based queries
CREATE INDEX IF NOT EXISTS idx_item_usage_patterns_country ON public.item_usage_patterns(country_code);
CREATE INDEX IF NOT EXISTS idx_section_templates_country ON public.section_templates(country_code);
CREATE INDEX IF NOT EXISTS idx_payment_templates_country ON public.payment_templates(country_code);
CREATE INDEX IF NOT EXISTS idx_terms_templates_country ON public.terms_templates(country_code);
CREATE INDEX IF NOT EXISTS idx_bank_detail_templates_country ON public.bank_detail_templates(country_code);
CREATE INDEX IF NOT EXISTS idx_warranty_templates_country ON public.warranty_templates(country_code);
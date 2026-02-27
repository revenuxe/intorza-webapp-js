
-- Add org_code column to profiles for company identification code
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS org_code text UNIQUE;

-- Create index for fast org_code lookups
CREATE INDEX IF NOT EXISTS idx_profiles_org_code ON public.profiles(org_code) WHERE org_code IS NOT NULL;

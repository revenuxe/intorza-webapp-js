
-- Drop and recreate the view with security_invoker = true
DROP VIEW IF EXISTS public.companies_public;

CREATE VIEW public.companies_public
WITH (security_invoker = true) AS
SELECT id, company_name
FROM public.profiles
WHERE company_name IS NOT NULL AND company_name != '';

-- Allow anyone authenticated to read from profiles for the view (already exists for own profile)
-- We need a policy that allows reading company_name for all profiles
CREATE POLICY "Anyone can view company names"
ON public.profiles FOR SELECT
USING (true);

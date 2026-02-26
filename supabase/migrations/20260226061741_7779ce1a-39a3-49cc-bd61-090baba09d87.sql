
-- Create table for team member join requests (self-registration)
CREATE TABLE public.team_member_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  work_type TEXT NOT NULL DEFAULT 'other',
  company_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'docs_requested')),
  rejection_reason TEXT,
  docs_request_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_member_requests ENABLE ROW LEVEL SECURITY;

-- Company owners can view requests for their company
CREATE POLICY "Owners can view their company requests"
ON public.team_member_requests FOR SELECT
USING (auth.uid() = company_id);

-- Company owners can update requests (approve/reject)
CREATE POLICY "Owners can update their company requests"
ON public.team_member_requests FOR UPDATE
USING (auth.uid() = company_id);

-- Authenticated users can insert requests (self-registration)
CREATE POLICY "Authenticated users can create requests"
ON public.team_member_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own requests
CREATE POLICY "Users can view own requests"
ON public.team_member_requests FOR SELECT
USING (auth.uid() = user_id);

-- Make company_name from profiles publicly readable for org search during signup
-- We need a view for this to avoid exposing sensitive profile data
CREATE VIEW public.companies_public
WITH (security_invoker = false) AS
SELECT id, company_name
FROM public.profiles
WHERE company_name IS NOT NULL AND company_name != '';

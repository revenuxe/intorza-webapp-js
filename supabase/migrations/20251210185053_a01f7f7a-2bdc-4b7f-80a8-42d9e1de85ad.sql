-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to view all quotations
CREATE POLICY "Admins can view all quotations" 
ON public.quotations 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to view all invoices
CREATE POLICY "Admins can view all invoices" 
ON public.invoices 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to view all site measurement projects
CREATE POLICY "Admins can view all site measurements" 
ON public.site_measurement_projects 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to view all team members
CREATE POLICY "Admins can view all team members" 
ON public.team_members 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to view all user activity
CREATE POLICY "Admins can view all user activity insert" 
ON public.user_activity 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
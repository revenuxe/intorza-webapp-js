-- Create a security definer function to check Pro subscription status
CREATE OR REPLACE FUNCTION public.is_pro_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND is_pro = true
      AND (pro_expiry IS NULL OR pro_expiry > now())
  )
$$;

-- Update site_measurement_projects INSERT policy to require Pro
DROP POLICY IF EXISTS "Users can insert own projects" ON site_measurement_projects;
CREATE POLICY "Pro users can insert site measurements"
ON site_measurement_projects FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  public.is_pro_user(auth.uid())
);

-- Update invoices INSERT policy to require Pro
DROP POLICY IF EXISTS "Users can insert own invoices" ON invoices;
CREATE POLICY "Pro users can insert invoices"
ON invoices FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  public.is_pro_user(auth.uid())
);

-- Update invoices UPDATE policy to require Pro
DROP POLICY IF EXISTS "Users can update own invoices" ON invoices;
CREATE POLICY "Pro users can update own invoices"
ON invoices FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id AND
  public.is_pro_user(auth.uid())
);

-- Update team_members INSERT policy to require Pro
DROP POLICY IF EXISTS "Companies can insert team members" ON team_members;
CREATE POLICY "Pro companies can insert team members"
ON team_members FOR INSERT
WITH CHECK (
  auth.uid() = company_id AND
  public.is_pro_user(auth.uid())
);

-- Update team_members UPDATE policy to require Pro
DROP POLICY IF EXISTS "Companies can update their team members" ON team_members;
CREATE POLICY "Pro companies can update team members"
ON team_members FOR UPDATE
USING (auth.uid() = company_id)
WITH CHECK (
  auth.uid() = company_id AND
  public.is_pro_user(auth.uid())
);

-- Update team_members DELETE policy to require Pro
DROP POLICY IF EXISTS "Companies can delete their team members" ON team_members;
CREATE POLICY "Pro companies can delete team members"
ON team_members FOR DELETE
USING (
  auth.uid() = company_id AND
  public.is_pro_user(auth.uid())
);

-- Update tasks INSERT policy to require Pro
DROP POLICY IF EXISTS "Companies can insert tasks" ON tasks;
CREATE POLICY "Pro companies can insert tasks"
ON tasks FOR INSERT
WITH CHECK (
  auth.uid() = company_id AND
  public.is_pro_user(auth.uid())
);

-- Update tasks UPDATE policy to require Pro
DROP POLICY IF EXISTS "Companies can update tasks" ON tasks;
CREATE POLICY "Pro companies can update tasks"
ON tasks FOR UPDATE
USING (auth.uid() = company_id)
WITH CHECK (
  auth.uid() = company_id AND
  public.is_pro_user(auth.uid())
);

-- Update tasks DELETE policy to require Pro
DROP POLICY IF EXISTS "Companies can delete tasks" ON tasks;
CREATE POLICY "Pro companies can delete tasks"
ON tasks FOR DELETE
USING (
  auth.uid() = company_id AND
  public.is_pro_user(auth.uid())
);

-- Update attendance INSERT policy to require Pro
DROP POLICY IF EXISTS "Team members can insert attendance" ON attendance;
CREATE POLICY "Pro team members can insert attendance"
ON attendance FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.id = attendance.team_member_id
    AND tm.user_id = auth.uid()
  ) AND
  public.is_pro_user(auth.uid())
);

-- Update attendance UPDATE policy to require Pro
DROP POLICY IF EXISTS "Team members can update own attendance" ON attendance;
CREATE POLICY "Pro team members can update attendance"
ON attendance FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.id = attendance.team_member_id
    AND tm.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.id = attendance.team_member_id
    AND tm.user_id = auth.uid()
  ) AND
  public.is_pro_user(auth.uid())
);

-- Update team_project_assignments INSERT policy to require Pro
DROP POLICY IF EXISTS "Insert assignments" ON team_project_assignments;
CREATE POLICY "Pro users can insert assignments"
ON team_project_assignments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.id = team_project_assignments.team_member_id
    AND tm.company_id = auth.uid()
  ) AND
  public.is_pro_user(auth.uid())
);

-- Update team_project_assignments UPDATE policy to require Pro
DROP POLICY IF EXISTS "Update assignments" ON team_project_assignments;
CREATE POLICY "Pro users can update assignments"
ON team_project_assignments FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.id = team_project_assignments.team_member_id
    AND tm.company_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.id = team_project_assignments.team_member_id
    AND tm.company_id = auth.uid()
  ) AND
  public.is_pro_user(auth.uid())
);

-- Update team_project_assignments DELETE policy to require Pro
DROP POLICY IF EXISTS "Delete assignments" ON team_project_assignments;
CREATE POLICY "Pro users can delete assignments"
ON team_project_assignments FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.id = team_project_assignments.team_member_id
    AND tm.company_id = auth.uid()
  ) AND
  public.is_pro_user(auth.uid())
);
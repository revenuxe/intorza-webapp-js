-- Create enum for work types
CREATE TYPE public.work_type AS ENUM ('carpenter', 'labour', 'plumber', 'electrician', 'painter', 'mason', 'welder', 'supervisor', 'other');

-- Create enum for team member status
CREATE TYPE public.team_member_status AS ENUM ('active', 'inactive', 'on_leave');

-- Create team_members table
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  work_type work_type NOT NULL DEFAULT 'other',
  status team_member_status NOT NULL DEFAULT 'active',
  daily_rate NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, email)
);

-- Create team_project_assignments table to link team members to projects
CREATE TABLE public.team_project_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  quotation_id UUID REFERENCES public.quotations(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

-- Create attendance table for clock in/out
CREATE TABLE public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  clock_in TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  clock_out TIMESTAMP WITH TIME ZONE,
  clock_in_location JSONB,
  clock_out_location JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quotation_id UUID REFERENCES public.quotations(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies for team_members
CREATE POLICY "Companies can view their team members" ON public.team_members
  FOR SELECT USING (auth.uid() = company_id OR auth.uid() = user_id);

CREATE POLICY "Companies can insert team members" ON public.team_members
  FOR INSERT WITH CHECK (auth.uid() = company_id);

CREATE POLICY "Companies can update their team members" ON public.team_members
  FOR UPDATE USING (auth.uid() = company_id);

CREATE POLICY "Companies can delete their team members" ON public.team_members
  FOR DELETE USING (auth.uid() = company_id);

-- RLS policies for team_project_assignments
CREATE POLICY "View assignments" ON public.team_project_assignments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM team_members tm WHERE tm.id = team_member_id AND (tm.company_id = auth.uid() OR tm.user_id = auth.uid()))
  );

CREATE POLICY "Insert assignments" ON public.team_project_assignments
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM team_members tm WHERE tm.id = team_member_id AND tm.company_id = auth.uid())
  );

CREATE POLICY "Update assignments" ON public.team_project_assignments
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM team_members tm WHERE tm.id = team_member_id AND tm.company_id = auth.uid())
  );

CREATE POLICY "Delete assignments" ON public.team_project_assignments
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM team_members tm WHERE tm.id = team_member_id AND tm.company_id = auth.uid())
  );

-- RLS policies for attendance
CREATE POLICY "View attendance" ON public.attendance
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM team_members tm WHERE tm.id = team_member_id AND (tm.company_id = auth.uid() OR tm.user_id = auth.uid()))
  );

CREATE POLICY "Team members can insert attendance" ON public.attendance
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM team_members tm WHERE tm.id = team_member_id AND tm.user_id = auth.uid())
  );

CREATE POLICY "Team members can update own attendance" ON public.attendance
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM team_members tm WHERE tm.id = team_member_id AND tm.user_id = auth.uid())
  );

-- RLS policies for tasks
CREATE POLICY "View tasks" ON public.tasks
  FOR SELECT USING (
    auth.uid() = company_id OR 
    EXISTS (SELECT 1 FROM team_members tm WHERE tm.id = assigned_to AND tm.user_id = auth.uid())
  );

CREATE POLICY "Companies can insert tasks" ON public.tasks
  FOR INSERT WITH CHECK (auth.uid() = company_id);

CREATE POLICY "Companies can update tasks" ON public.tasks
  FOR UPDATE USING (auth.uid() = company_id);

CREATE POLICY "Companies can delete tasks" ON public.tasks
  FOR DELETE USING (auth.uid() = company_id);

-- Triggers for updated_at
CREATE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
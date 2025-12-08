-- Create site measurement projects table
CREATE TABLE public.site_measurement_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_name TEXT NOT NULL,
  site_location TEXT,
  assigned_to UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'converted', 'completed')),
  quotation_id UUID REFERENCES public.quotations(id) ON DELETE SET NULL,
  total_area NUMERIC DEFAULT 0,
  room_count INTEGER DEFAULT 0,
  photo_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create site measurement rooms table
CREATE TABLE public.site_measurement_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.site_measurement_projects(id) ON DELETE CASCADE,
  room_type TEXT NOT NULL,
  room_name TEXT,
  width_ft NUMERIC NOT NULL DEFAULT 0,
  length_ft NUMERIC NOT NULL DEFAULT 0,
  height_ft NUMERIC,
  area_sqft NUMERIC GENERATED ALWAYS AS (width_ft * length_ft) STORED,
  notes TEXT,
  pricing_mode TEXT CHECK (pricing_mode IN ('per_sqft', 'lump_sum', 'per_unit')),
  rate_per_sqft NUMERIC,
  lump_sum_amount NUMERIC,
  quantity NUMERIC,
  rate_per_unit NUMERIC,
  final_amount NUMERIC,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create room photos table
CREATE TABLE public.room_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.site_measurement_rooms(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_measurement_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_measurement_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_photos ENABLE ROW LEVEL SECURITY;

-- RLS policies for site_measurement_projects
CREATE POLICY "Users can view own projects or assigned projects"
ON public.site_measurement_projects FOR SELECT
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM team_members tm 
    WHERE tm.id = site_measurement_projects.assigned_to 
    AND (tm.company_id = auth.uid() OR tm.user_id = auth.uid())
  )
);

CREATE POLICY "Users can insert own projects"
ON public.site_measurement_projects FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects or assigned projects"
ON public.site_measurement_projects FOR UPDATE
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM team_members tm 
    WHERE tm.id = site_measurement_projects.assigned_to 
    AND (tm.company_id = auth.uid() OR tm.user_id = auth.uid())
  )
);

CREATE POLICY "Users can delete own projects"
ON public.site_measurement_projects FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for site_measurement_rooms
CREATE POLICY "Users can view rooms of accessible projects"
ON public.site_measurement_rooms FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM site_measurement_projects smp 
    WHERE smp.id = site_measurement_rooms.project_id 
    AND (
      smp.user_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.id = smp.assigned_to 
        AND (tm.company_id = auth.uid() OR tm.user_id = auth.uid())
      )
    )
  )
);

CREATE POLICY "Users can insert rooms to accessible projects"
ON public.site_measurement_rooms FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM site_measurement_projects smp 
    WHERE smp.id = site_measurement_rooms.project_id 
    AND (
      smp.user_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.id = smp.assigned_to 
        AND (tm.company_id = auth.uid() OR tm.user_id = auth.uid())
      )
    )
  )
);

CREATE POLICY "Users can update rooms of accessible projects"
ON public.site_measurement_rooms FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM site_measurement_projects smp 
    WHERE smp.id = site_measurement_rooms.project_id 
    AND (
      smp.user_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.id = smp.assigned_to 
        AND (tm.company_id = auth.uid() OR tm.user_id = auth.uid())
      )
    )
  )
);

CREATE POLICY "Users can delete rooms of accessible projects"
ON public.site_measurement_rooms FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM site_measurement_projects smp 
    WHERE smp.id = site_measurement_rooms.project_id 
    AND (
      smp.user_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.id = smp.assigned_to 
        AND (tm.company_id = auth.uid() OR tm.user_id = auth.uid())
      )
    )
  )
);

-- RLS policies for room_photos
CREATE POLICY "Users can view photos of accessible rooms"
ON public.room_photos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM site_measurement_rooms smr
    JOIN site_measurement_projects smp ON smp.id = smr.project_id
    WHERE smr.id = room_photos.room_id 
    AND (
      smp.user_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.id = smp.assigned_to 
        AND (tm.company_id = auth.uid() OR tm.user_id = auth.uid())
      )
    )
  )
);

CREATE POLICY "Users can insert photos to accessible rooms"
ON public.room_photos FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM site_measurement_rooms smr
    JOIN site_measurement_projects smp ON smp.id = smr.project_id
    WHERE smr.id = room_photos.room_id 
    AND (
      smp.user_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.id = smp.assigned_to 
        AND (tm.company_id = auth.uid() OR tm.user_id = auth.uid())
      )
    )
  )
);

CREATE POLICY "Users can delete photos from accessible rooms"
ON public.room_photos FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM site_measurement_rooms smr
    JOIN site_measurement_projects smp ON smp.id = smr.project_id
    WHERE smr.id = room_photos.room_id 
    AND (
      smp.user_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.id = smp.assigned_to 
        AND (tm.company_id = auth.uid() OR tm.user_id = auth.uid())
      )
    )
  )
);

-- Create storage bucket for room photos
INSERT INTO storage.buckets (id, name, public) VALUES ('room-photos', 'room-photos', true);

-- Storage policies for room photos
CREATE POLICY "Authenticated users can upload room photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'room-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view room photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'room-photos');

CREATE POLICY "Users can delete own room photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'room-photos' AND auth.role() = 'authenticated');

-- Triggers for updated_at
CREATE TRIGGER update_site_measurement_projects_updated_at
BEFORE UPDATE ON public.site_measurement_projects
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_site_measurement_rooms_updated_at
BEFORE UPDATE ON public.site_measurement_rooms
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
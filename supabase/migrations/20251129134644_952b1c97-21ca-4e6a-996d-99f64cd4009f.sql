-- Add professional_advantages to profiles for custom text
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS professional_advantages TEXT;

-- Create storage bucket for company logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can upload their own logo" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update their own logo" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own logo" ON storage.objects;
  DROP POLICY IF EXISTS "Logos are publicly accessible" ON storage.objects;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Create RLS policies for company logos
CREATE POLICY "Users can upload their own logo"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'company-logos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own logo"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'company-logos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own logo"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'company-logos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-logos');
-- Make the room-photos bucket private to prevent unauthorized access
UPDATE storage.buckets SET public = false WHERE name = 'room-photos';

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Authenticated users can upload room photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view room photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete room photos" ON storage.objects;

-- Allow authenticated users to upload to room-photos bucket
CREATE POLICY "Authenticated users can upload room photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'room-photos');

-- Allow authenticated users to read room photos (via signed URLs)
CREATE POLICY "Authenticated users can view room photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'room-photos');

-- Allow authenticated users to delete their room photos
CREATE POLICY "Authenticated users can delete room photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'room-photos');
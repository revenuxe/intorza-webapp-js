-- Drop the existing check constraint
ALTER TABLE public.quotations DROP CONSTRAINT IF EXISTS quotations_status_check;

-- Add updated check constraint that includes 'draft'
ALTER TABLE public.quotations ADD CONSTRAINT quotations_status_check 
CHECK (status = ANY (ARRAY['draft'::text, 'pending'::text, 'accepted'::text, 'rejected'::text, 'converted'::text]));
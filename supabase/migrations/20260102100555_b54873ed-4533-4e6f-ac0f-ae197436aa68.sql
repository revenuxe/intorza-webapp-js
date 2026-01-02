-- Add font preference columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS pdf_heading_font text DEFAULT 'times',
ADD COLUMN IF NOT EXISTS pdf_body_font text DEFAULT 'helvetica';

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.pdf_heading_font IS 'User preferred font for PDF headings';
COMMENT ON COLUMN public.profiles.pdf_body_font IS 'User preferred font for PDF body text';
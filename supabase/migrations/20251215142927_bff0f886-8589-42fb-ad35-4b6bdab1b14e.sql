-- Create quotation_templates table for user-saved templates
CREATE TABLE public.quotation_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  template_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'Custom',
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_default BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quotation_templates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own templates"
ON public.quotation_templates
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own templates"
ON public.quotation_templates
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
ON public.quotation_templates
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
ON public.quotation_templates
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_quotation_templates_updated_at
BEFORE UPDATE ON public.quotation_templates
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Add brand_colors field to profiles for storing extracted brand colors
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS brand_colors JSONB DEFAULT NULL;
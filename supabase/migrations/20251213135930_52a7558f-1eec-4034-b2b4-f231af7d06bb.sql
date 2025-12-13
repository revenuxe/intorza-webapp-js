-- Add category column to item_usage_patterns
ALTER TABLE public.item_usage_patterns 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General';

-- Create section templates table for quick section creation
CREATE TABLE IF NOT EXISTS public.section_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  items JSONB NOT NULL DEFAULT '[]',
  usage_count INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.section_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for section_templates
CREATE POLICY "Users can view own section templates" 
ON public.section_templates FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own section templates" 
ON public.section_templates FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own section templates" 
ON public.section_templates FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own section templates" 
ON public.section_templates FOR DELETE 
USING (auth.uid() = user_id);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_item_patterns_category ON public.item_usage_patterns(user_id, category);
CREATE INDEX IF NOT EXISTS idx_section_templates_category ON public.section_templates(user_id, category);
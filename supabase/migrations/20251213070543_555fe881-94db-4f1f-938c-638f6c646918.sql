-- Create table for storing user quotation preferences and defaults
CREATE TABLE public.quotation_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Default field values
  default_warranty TEXT DEFAULT '10',
  default_project_type TEXT,
  default_place_of_project TEXT,
  default_gst_enabled BOOLEAN DEFAULT false,
  default_gst_rate TEXT DEFAULT '18',
  default_discount_percentage NUMERIC DEFAULT 0,
  default_social_media_discount_enabled BOOLEAN DEFAULT false,
  default_social_media_discount_rate NUMERIC DEFAULT 6,
  default_quotation_valid_days INTEGER DEFAULT 7,
  -- Last used values (for memory)
  last_warranty TEXT,
  last_project_type TEXT,
  last_place_of_project TEXT,
  last_gst_enabled BOOLEAN,
  last_gst_rate TEXT,
  last_discount_percentage NUMERIC,
  last_social_media_discount_enabled BOOLEAN,
  last_social_media_discount_rate NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create table for storing product/item usage patterns
CREATE TABLE public.item_usage_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  product_details TEXT,
  default_rate NUMERIC,
  preferred_rate NUMERIC,
  usage_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_name)
);

-- Create index for faster lookups
CREATE INDEX idx_item_usage_patterns_user_id ON public.item_usage_patterns(user_id);
CREATE INDEX idx_item_usage_patterns_usage ON public.item_usage_patterns(user_id, usage_count DESC, last_used_at DESC);

-- Enable RLS
ALTER TABLE public.quotation_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_usage_patterns ENABLE ROW LEVEL SECURITY;

-- RLS policies for quotation_preferences
CREATE POLICY "Users can view own preferences" ON public.quotation_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON public.quotation_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON public.quotation_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS policies for item_usage_patterns
CREATE POLICY "Users can view own item patterns" ON public.item_usage_patterns
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own item patterns" ON public.item_usage_patterns
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own item patterns" ON public.item_usage_patterns
  FOR UPDATE USING (auth.uid() = user_id);

-- Create updated_at trigger for quotation_preferences
CREATE TRIGGER update_quotation_preferences_updated_at
  BEFORE UPDATE ON public.quotation_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create updated_at trigger for item_usage_patterns
CREATE TRIGGER update_item_usage_patterns_updated_at
  BEFORE UPDATE ON public.item_usage_patterns
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
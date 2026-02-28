
-- Gallery images table
CREATE TABLE public.gallery_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  filename TEXT NOT NULL,
  title TEXT,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  category TEXT DEFAULT 'General',
  file_size INTEGER,
  width INTEGER,
  height INTEGER,
  is_favorite BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own gallery images" ON public.gallery_images FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own gallery images" ON public.gallery_images FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own gallery images" ON public.gallery_images FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own gallery images" ON public.gallery_images FOR DELETE USING (auth.uid() = user_id);

-- Index for tag search
CREATE INDEX idx_gallery_images_tags ON public.gallery_images USING GIN(tags);
CREATE INDEX idx_gallery_images_user_id ON public.gallery_images (user_id);
CREATE INDEX idx_gallery_images_category ON public.gallery_images (user_id, category);

-- Junction table for quotation item images
CREATE TABLE public.quotation_item_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_item_id UUID NOT NULL REFERENCES public.quotation_items(id) ON DELETE CASCADE,
  gallery_image_id UUID NOT NULL REFERENCES public.gallery_images(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(quotation_item_id, gallery_image_id)
);

ALTER TABLE public.quotation_item_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own item images" ON public.quotation_item_images FOR SELECT
USING (EXISTS (
  SELECT 1 FROM quotation_items qi
  JOIN quotation_sections qs ON qs.id = qi.section_id
  JOIN quotations q ON q.id = qs.quotation_id
  WHERE qi.id = quotation_item_images.quotation_item_id AND q.user_id = auth.uid()
));

CREATE POLICY "Users can insert own item images" ON public.quotation_item_images FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM quotation_items qi
  JOIN quotation_sections qs ON qs.id = qi.section_id
  JOIN quotations q ON q.id = qs.quotation_id
  WHERE qi.id = quotation_item_images.quotation_item_id AND q.user_id = auth.uid()
));

CREATE POLICY "Users can delete own item images" ON public.quotation_item_images FOR DELETE
USING (EXISTS (
  SELECT 1 FROM quotation_items qi
  JOIN quotation_sections qs ON qs.id = qi.section_id
  JOIN quotations q ON q.id = qs.quotation_id
  WHERE qi.id = quotation_item_images.quotation_item_id AND q.user_id = auth.uid()
));

-- Trigger for updated_at
CREATE TRIGGER update_gallery_images_updated_at
BEFORE UPDATE ON public.gallery_images
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

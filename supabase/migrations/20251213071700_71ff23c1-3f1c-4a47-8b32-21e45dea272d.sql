-- Create payment_templates table for stage-wise payment plans
CREATE TABLE public.payment_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  template_name TEXT NOT NULL,
  stages JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create terms_templates table for T&C templates
CREATE TABLE public.terms_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  template_name TEXT NOT NULL,
  template_type TEXT NOT NULL DEFAULT 'quotation', -- 'quotation' or 'invoice'
  content JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bank_detail_templates table
CREATE TABLE public.bank_detail_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  template_name TEXT NOT NULL,
  account_holder_name TEXT,
  bank_name TEXT,
  account_number TEXT,
  ifsc_code TEXT,
  upi_id TEXT,
  qr_code_url TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create warranty_templates table
CREATE TABLE public.warranty_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  template_name TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.payment_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_detail_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warranty_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for payment_templates
CREATE POLICY "Users can view own payment templates" ON public.payment_templates
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own payment templates" ON public.payment_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own payment templates" ON public.payment_templates
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own payment templates" ON public.payment_templates
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for terms_templates
CREATE POLICY "Users can view own terms templates" ON public.terms_templates
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own terms templates" ON public.terms_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own terms templates" ON public.terms_templates
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own terms templates" ON public.terms_templates
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for bank_detail_templates
CREATE POLICY "Users can view own bank templates" ON public.bank_detail_templates
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bank templates" ON public.bank_detail_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bank templates" ON public.bank_detail_templates
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own bank templates" ON public.bank_detail_templates
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for warranty_templates
CREATE POLICY "Users can view own warranty templates" ON public.warranty_templates
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own warranty templates" ON public.warranty_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own warranty templates" ON public.warranty_templates
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own warranty templates" ON public.warranty_templates
  FOR DELETE USING (auth.uid() = user_id);

-- Add updated_at triggers
CREATE TRIGGER update_payment_templates_updated_at
  BEFORE UPDATE ON public.payment_templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_terms_templates_updated_at
  BEFORE UPDATE ON public.terms_templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_bank_detail_templates_updated_at
  BEFORE UPDATE ON public.bank_detail_templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_warranty_templates_updated_at
  BEFORE UPDATE ON public.warranty_templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
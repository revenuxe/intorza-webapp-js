-- Add subscription fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_pro boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pro_since timestamp with time zone,
ADD COLUMN IF NOT EXISTS pro_plan text DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS pro_expiry timestamp with time zone,
ADD COLUMN IF NOT EXISTS payment_provider text DEFAULT 'razorpay',
ADD COLUMN IF NOT EXISTS provider_customer_id text,
ADD COLUMN IF NOT EXISTS provider_subscription_id text,
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS promo_code text;

-- Create payment_logs table
CREATE TABLE IF NOT EXISTS public.payment_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'razorpay',
  event_type text NOT NULL,
  provider_event_id text UNIQUE,
  amount numeric,
  currency text DEFAULT 'INR',
  status text,
  raw_payload jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on payment_logs
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for payment_logs
CREATE POLICY "Users can view own payment logs"
ON public.payment_logs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all payment logs"
ON public.payment_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert payment logs"
ON public.payment_logs
FOR INSERT
WITH CHECK (true);

-- Create subscription_events table (audit trail)
CREATE TABLE IF NOT EXISTS public.subscription_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event text NOT NULL,
  notes text,
  actor text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on subscription_events
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for subscription_events
CREATE POLICY "Users can view own subscription events"
ON public.subscription_events
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscription events"
ON public.subscription_events
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert subscription events"
ON public.subscription_events
FOR INSERT
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payment_logs_user_id ON public.payment_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_provider_event_id ON public.payment_logs(provider_event_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_user_id ON public.subscription_events(user_id);
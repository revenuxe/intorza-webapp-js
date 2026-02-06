-- Fix #1: Drop overly permissive INSERT policies on payment_logs and subscription_events
-- These tables should ONLY be writable via service role (edge functions)

-- Drop the permissive INSERT policy on payment_logs
DROP POLICY IF EXISTS "System can insert payment logs" ON public.payment_logs;

-- Drop the permissive INSERT policy on subscription_events  
DROP POLICY IF EXISTS "System can insert subscription events" ON public.subscription_events;
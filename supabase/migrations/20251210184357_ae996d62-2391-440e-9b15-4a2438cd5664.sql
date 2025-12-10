-- Create user_activity table for tracking daily users, page views, etc.
CREATE TABLE public.user_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL, -- 'login', 'page_view', 'action'
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

-- Users can insert their own activity
CREATE POLICY "Users can insert own activity" 
ON public.user_activity 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can view own activity
CREATE POLICY "Users can view own activity" 
ON public.user_activity 
FOR SELECT 
USING (auth.uid() = user_id);

-- Admins can view all activity
CREATE POLICY "Admins can view all activity" 
ON public.user_activity 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add feedback_type column to feedback table
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS feedback_type TEXT DEFAULT 'feedback';

-- Create index for performance
CREATE INDEX idx_user_activity_date ON public.user_activity(activity_date);
CREATE INDEX idx_user_activity_user ON public.user_activity(user_id);
CREATE INDEX idx_feedback_type ON public.feedback(feedback_type);
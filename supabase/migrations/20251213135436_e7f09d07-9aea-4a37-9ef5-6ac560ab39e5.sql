-- Add delete policy for item_usage_patterns
CREATE POLICY "Users can delete own item patterns" 
ON public.item_usage_patterns 
FOR DELETE 
USING (auth.uid() = user_id);
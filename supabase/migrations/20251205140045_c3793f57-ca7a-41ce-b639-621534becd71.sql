-- Add missing UPDATE and DELETE policies for payments table
CREATE POLICY "Users can update payments for own invoices" 
ON public.payments 
FOR UPDATE 
USING (
  EXISTS (SELECT 1 FROM invoices WHERE invoices.id = payments.invoice_id AND invoices.user_id = auth.uid())
);

CREATE POLICY "Users can delete payments for own invoices" 
ON public.payments 
FOR DELETE 
USING (
  EXISTS (SELECT 1 FROM invoices WHERE invoices.id = payments.invoice_id AND invoices.user_id = auth.uid())
);
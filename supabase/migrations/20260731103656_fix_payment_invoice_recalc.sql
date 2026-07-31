-- The app used to rely on a Node/RDS backend (backend/src/routes/invoices.js) to recompute
-- invoices.paid_amount / remaining_amount / status whenever a payment was added. That backend
-- is no longer called (everything now talks to Supabase directly via src/lib/api.ts), and no
-- equivalent recalculation was ever added here, so recording a payment currently leaves the
-- invoice's balance/status permanently stale. This adds a trigger that keeps them in sync.
--
-- SECURITY DEFINER is required: the person recording a payment already passed the payments
-- INSERT policy (which checks they own the parent invoice), but the invoices UPDATE policy
-- separately requires is_pro_user(auth.uid()) in its WITH CHECK clause. That's a deliberate
-- paywall on user-initiated invoice edits and shouldn't gate this system-maintained aggregate,
-- so the trigger runs with the function owner's privileges (bypassing RLS) rather than being
-- coupled to Pro status.

CREATE OR REPLACE FUNCTION public.recalc_invoice_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_invoice_id uuid := COALESCE(NEW.invoice_id, OLD.invoice_id);
  v_total numeric;
  v_paid numeric;
  v_due_date date;
BEGIN
  SELECT total_amount, due_date INTO v_total, v_due_date
  FROM public.invoices
  WHERE id = v_invoice_id;

  IF NOT FOUND THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_paid
  FROM public.payments
  WHERE invoice_id = v_invoice_id;

  UPDATE public.invoices
  SET
    paid_amount = v_paid,
    remaining_amount = v_total - v_paid,
    status = CASE
      WHEN v_total - v_paid <= 0 THEN 'paid'
      WHEN v_paid > 0 THEN 'partially_paid'
      WHEN v_due_date IS NOT NULL AND v_due_date < CURRENT_DATE THEN 'overdue'
      ELSE 'unpaid'
    END,
    updated_at = now()
  WHERE id = v_invoice_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_invoice_on_payment_change ON public.payments;
CREATE TRIGGER trg_recalc_invoice_on_payment_change
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.recalc_invoice_totals();

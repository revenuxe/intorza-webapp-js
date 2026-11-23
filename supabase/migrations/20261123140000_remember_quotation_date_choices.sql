-- New nullable preferences intentionally require every account to choose once.
-- Saved quotations and the previous validity default remain unchanged.
ALTER TABLE public.quotation_preferences
  ADD COLUMN IF NOT EXISTS chosen_valid_days integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS chosen_deadline_days integer DEFAULT NULL;

ALTER TABLE public.quotation_preferences
  ADD CONSTRAINT quotation_chosen_valid_days_check CHECK (chosen_valid_days >= 0),
  ADD CONSTRAINT quotation_chosen_deadline_days_check CHECK (chosen_deadline_days >= 0);

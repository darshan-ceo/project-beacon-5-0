-- Add outcome_text column to hearings table for storing outcome notes
ALTER TABLE public.hearings 
ADD COLUMN IF NOT EXISTS outcome_text TEXT;

COMMENT ON COLUMN public.hearings.outcome_text IS 'Notes related to the hearing outcome (e.g., order details, adjournment reason)';
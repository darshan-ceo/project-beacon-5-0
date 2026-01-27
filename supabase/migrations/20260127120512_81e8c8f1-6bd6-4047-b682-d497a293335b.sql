-- Add missing columns for judge edit functionality
ALTER TABLE public.judges 
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS address jsonb DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN public.judges.updated_by IS 'User ID who last updated the judge record';
COMMENT ON COLUMN public.judges.address IS 'Full address information as JSONB';
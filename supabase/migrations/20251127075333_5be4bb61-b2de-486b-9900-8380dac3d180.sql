-- Add city column to cases table if it doesn't exist
ALTER TABLE public.cases
ADD COLUMN IF NOT EXISTS city character varying;
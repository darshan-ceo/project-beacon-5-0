-- Add Phase 1 columns to judges table
ALTER TABLE public.judges 
  ADD COLUMN IF NOT EXISTS member_type varchar(50),
  ADD COLUMN IF NOT EXISTS authority_level varchar(50),
  ADD COLUMN IF NOT EXISTS qualifications jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tenure_details jsonb DEFAULT '{}';

-- Add comments for documentation
COMMENT ON COLUMN public.judges.member_type IS 'Judicial, Technical-Centre, Technical-State, President, Vice President, Not Applicable';
COMMENT ON COLUMN public.judges.authority_level IS 'ADJUDICATION, FIRST_APPEAL, TRIBUNAL, HIGH_COURT, SUPREME_COURT';
COMMENT ON COLUMN public.judges.qualifications IS 'JSON: {educationalQualification, yearsOfExperience, previousPosition, specialization, governmentNominee}';
COMMENT ON COLUMN public.judges.tenure_details IS 'JSON: {tenureStartDate, tenureEndDate, maxTenureYears, extensionGranted, ageLimit}';
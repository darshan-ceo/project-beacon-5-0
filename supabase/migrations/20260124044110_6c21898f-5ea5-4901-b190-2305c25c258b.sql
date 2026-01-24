-- Phase 4: Import/Export State Migration
-- Add pending_data column for storing records requiring manual correction
ALTER TABLE data_jobs ADD COLUMN IF NOT EXISTS pending_data JSONB;

-- Create storage bucket for import/export files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('import-exports', 'import-exports', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: Users can manage their own files (folder structure: {user_id}/{job_id}/filename)
CREATE POLICY "Users manage own import/export files"
ON storage.objects FOR ALL
USING (
  bucket_id = 'import-exports' 
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'import-exports' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
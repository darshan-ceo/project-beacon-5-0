-- Fix document upload storage policy to allow authenticated users to upload
-- Drop the overly restrictive tenant folder policy
DROP POLICY IF EXISTS "Users can upload to their tenant folder" ON storage.objects;

-- Create a more flexible policy that validates tenant membership
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  -- Verify user has a valid profile with tenant membership
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.tenant_id IS NOT NULL
  )
);

-- Allow admins/partners to SELECT files in the client-uploads folder
CREATE POLICY "Admins can view client uploads"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'client-uploads'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'partner'::app_role)
  )
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tenant_id IS NOT NULL
  )
);

-- Allow admins/partners to DELETE files in the client-uploads folder
CREATE POLICY "Admins can delete client uploads"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'client-uploads'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'partner'::app_role)
  )
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tenant_id IS NOT NULL
  )
);

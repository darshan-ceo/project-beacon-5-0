-- Add RLS policy for clients to view their own documents via portal
CREATE POLICY "Clients view own documents via portal"
ON public.documents FOR SELECT
USING (
  client_id IN (
    SELECT cpu.client_id FROM client_portal_users cpu 
    WHERE cpu.user_id = auth.uid() AND cpu.is_active = true
  )
);

-- Add RLS policy for clients to insert documents
CREATE POLICY "Clients can upload documents via portal"
ON public.documents FOR INSERT
WITH CHECK (
  (tenant_id IN (
    SELECT cpu.tenant_id FROM client_portal_users cpu 
    WHERE cpu.user_id = auth.uid() AND cpu.is_active = true
  ))
  AND (uploaded_by = auth.uid())
  AND (client_id IN (
    SELECT cpu.client_id FROM client_portal_users cpu 
    WHERE cpu.user_id = auth.uid() AND cpu.is_active = true
  ))
);

-- Storage policy for clients to upload to documents bucket
CREATE POLICY "Clients can upload to documents bucket"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents' AND
  auth.uid() IN (
    SELECT cpu.user_id FROM client_portal_users cpu 
    WHERE cpu.is_active = true
  ) AND
  (storage.foldername(name))[1] = 'client-uploads'
);

-- Storage policy for clients to view their uploaded documents
CREATE POLICY "Clients can view own uploads in documents bucket"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' AND
  auth.uid() IN (
    SELECT cpu.user_id FROM client_portal_users cpu 
    WHERE cpu.is_active = true
  )
);
-- Create documents storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  52428800, -- 50MB
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'text/plain'
  ]
);

-- RLS Policy: Users can upload to their tenant folder
CREATE POLICY "Users can upload to their tenant folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = (
    SELECT tenant_id::text FROM profiles WHERE id = auth.uid()
  )
);

-- RLS Policy: Users can view their tenant documents
CREATE POLICY "Users can view their tenant documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = (
    SELECT tenant_id::text FROM profiles WHERE id = auth.uid()
  )
);

-- RLS Policy: Document owner or admins can update
CREATE POLICY "Document owner or admins can update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = (
    SELECT tenant_id::text FROM profiles WHERE id = auth.uid()
  ) AND
  (
    owner = auth.uid() OR
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'partner')
  )
);

-- RLS Policy: Admins and partners can delete
CREATE POLICY "Admins and partners can delete documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = (
    SELECT tenant_id::text FROM profiles WHERE id = auth.uid()
  ) AND
  (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'partner')
  )
);

-- Update handle_new_user function to assign default role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _default_tenant_id UUID;
  _is_first_user BOOLEAN;
BEGIN
  -- Get tenant_id from user metadata (set during signup)
  _default_tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::UUID;
  
  IF _default_tenant_id IS NOT NULL THEN
    -- Check if this is the first user in the tenant
    SELECT NOT EXISTS (
      SELECT 1 FROM profiles WHERE tenant_id = _default_tenant_id
    ) INTO _is_first_user;
    
    -- Create profile
    INSERT INTO profiles (id, tenant_id, full_name, phone)
    VALUES (
      NEW.id,
      _default_tenant_id,
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'phone'
    );
    
    -- Assign role: first user gets admin, others get user role
    INSERT INTO user_roles (user_id, role, granted_by)
    VALUES (
      NEW.id,
      CASE WHEN _is_first_user THEN 'admin'::app_role ELSE 'user'::app_role END,
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$function$;
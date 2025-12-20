-- Drop and recreate the policies with proper handling
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;

-- Recreate INSERT policy with SECURITY DEFINER pattern for reliability
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (auth.uid())::text = split_part(name, '/', 1)
);

-- Recreate UPDATE policy
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (auth.uid())::text = split_part(name, '/', 1)
)
WITH CHECK (
  bucket_id = 'avatars' 
  AND (auth.uid())::text = split_part(name, '/', 1)
);
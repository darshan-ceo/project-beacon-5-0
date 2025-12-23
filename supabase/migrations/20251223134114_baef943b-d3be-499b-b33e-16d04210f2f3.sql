-- Allow portal users to update their own login timestamp
CREATE POLICY "Portal users can update own record"
ON public.client_portal_users
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
-- Drop the existing policy with incorrect role
DROP POLICY IF EXISTS "Users view own portal access" ON public.client_portal_users;

-- Create corrected policy with authenticated role
CREATE POLICY "Users view own portal access"
ON public.client_portal_users
FOR SELECT
TO authenticated
USING (user_id = auth.uid());
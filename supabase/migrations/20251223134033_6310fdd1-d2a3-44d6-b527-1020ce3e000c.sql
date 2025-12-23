-- Add RLS policy allowing portal users to view their associated client
CREATE POLICY "Portal users can view their client"
ON public.clients
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM client_portal_users cpu
    WHERE cpu.client_id = clients.id
      AND cpu.user_id = auth.uid()
      AND cpu.is_active = true
  )
);
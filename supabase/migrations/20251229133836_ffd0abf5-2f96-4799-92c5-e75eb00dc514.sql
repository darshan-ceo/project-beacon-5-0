-- Allow client portal users to view their client cases
CREATE POLICY "Portal users can view their client cases"
ON public.cases
FOR SELECT
TO authenticated
USING (
  client_id IN (
    SELECT cpu.client_id 
    FROM client_portal_users cpu 
    WHERE cpu.user_id = auth.uid() 
    AND cpu.is_active = true
  )
);

-- Allow client portal users to view hearings for their cases
CREATE POLICY "Portal users can view their client hearings"
ON public.hearings
FOR SELECT
TO authenticated
USING (
  case_id IN (
    SELECT c.id 
    FROM cases c
    JOIN client_portal_users cpu ON c.client_id = cpu.client_id
    WHERE cpu.user_id = auth.uid() 
    AND cpu.is_active = true
  )
);
-- Drop the existing portal document SELECT policy
DROP POLICY IF EXISTS "Clients view own documents via portal" ON public.documents;

-- Create enhanced portal document SELECT policy
-- Portal users can view documents that are:
-- 1. Directly tagged to their client (client_id match), OR
-- 2. Linked to cases belonging to their client (case_id in client's cases)
CREATE POLICY "Portal users view client and case documents" 
ON public.documents 
FOR SELECT 
USING (
  -- Check if user is an active portal user
  EXISTS (
    SELECT 1 FROM client_portal_users cpu
    WHERE cpu.user_id = auth.uid()
    AND cpu.is_active = true
    AND (
      -- Document directly tagged to portal user's client
      documents.client_id = cpu.client_id
      OR
      -- Document linked to a case that belongs to the portal user's client
      (
        documents.case_id IS NOT NULL 
        AND documents.case_id IN (
          SELECT c.id FROM cases c 
          WHERE c.client_id = cpu.client_id
        )
      )
    )
  )
);
-- Fix RLS INSERT policy for notifications to allow cross-user notification creation within same tenant
-- This enables User A to create notifications for User B when assigning tasks or scheduling hearings

-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Users can insert their own notifications" ON notifications;

-- Create permissive INSERT policy that allows tenant-scoped inserts
CREATE POLICY "Users can insert notifications for same tenant" ON notifications
  FOR INSERT
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
  );
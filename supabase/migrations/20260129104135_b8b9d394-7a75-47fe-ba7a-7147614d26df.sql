-- Create SECURITY DEFINER function to bypass RLS for notification creation
-- This fixes the RLS INSERT policy failure when auth.uid() timing issues occur

CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_related_entity_type text DEFAULT NULL,
  p_related_entity_id uuid DEFAULT NULL,
  p_channels text[] DEFAULT ARRAY['in_app'],
  p_metadata jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_tenant_id uuid;
  v_notification_id uuid;
BEGIN
  -- Get caller's tenant from profiles
  SELECT tenant_id INTO v_tenant_id FROM profiles WHERE id = auth.uid();
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Unable to determine tenant for current user';
  END IF;
  
  -- Generate notification ID
  v_notification_id := gen_random_uuid();
  
  -- Insert bypassing RLS
  INSERT INTO notifications (
    id, tenant_id, user_id, type, title, message,
    related_entity_type, related_entity_id, channels, status, read, metadata, created_at
  ) VALUES (
    v_notification_id, v_tenant_id, p_user_id, p_type, p_title, p_message,
    p_related_entity_type, p_related_entity_id, p_channels, 'pending', false, p_metadata, now()
  );
  
  RETURN v_notification_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, text, uuid, text[], jsonb) TO authenticated;
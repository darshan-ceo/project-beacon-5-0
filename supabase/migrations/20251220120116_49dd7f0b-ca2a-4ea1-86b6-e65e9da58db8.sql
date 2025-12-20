-- Create client_portal_users table - Links auth users to clients for portal access
CREATE TABLE public.client_portal_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  email text NOT NULL,
  is_active boolean DEFAULT true,
  last_login_at timestamptz,
  portal_role varchar(50) DEFAULT 'viewer',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  UNIQUE(user_id, client_id)
);

-- Create indexes for client_portal_users
CREATE INDEX idx_client_portal_users_user ON client_portal_users(user_id);
CREATE INDEX idx_client_portal_users_client ON client_portal_users(client_id);
CREATE INDEX idx_client_portal_users_tenant ON client_portal_users(tenant_id);

-- Enable RLS on client_portal_users
ALTER TABLE client_portal_users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own portal access
CREATE POLICY "Users view own portal access" ON client_portal_users
FOR SELECT USING (user_id = auth.uid());

-- Policy: Staff admins/partners can manage client portal users
CREATE POLICY "Staff manage portal users" ON client_portal_users
FOR ALL USING (
  tenant_id = get_user_tenant_id() AND 
  (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner'))
);

-- Create client_notifications table
CREATE TABLE public.client_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  type varchar(50) NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  read boolean DEFAULT false,
  urgent boolean DEFAULT false,
  action_required boolean DEFAULT false,
  related_entity_type varchar(50),
  related_entity_id uuid,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz,
  metadata jsonb DEFAULT '{}'
);

-- Create indexes for client_notifications
CREATE INDEX idx_client_notifications_client ON client_notifications(client_id);
CREATE INDEX idx_client_notifications_tenant ON client_notifications(tenant_id);
CREATE INDEX idx_client_notifications_unread ON client_notifications(client_id, read) WHERE read = false;
CREATE INDEX idx_client_notifications_created ON client_notifications(created_at DESC);

-- Enable RLS on client_notifications
ALTER TABLE client_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Clients view their own notifications via portal user link
CREATE POLICY "Clients view own notifications" ON client_notifications
FOR SELECT USING (
  client_id IN (
    SELECT cpu.client_id FROM client_portal_users cpu 
    WHERE cpu.user_id = auth.uid() AND cpu.is_active = true
  )
);

-- Policy: Clients can update (mark as read) their own notifications
CREATE POLICY "Clients update own notifications" ON client_notifications
FOR UPDATE USING (
  client_id IN (
    SELECT cpu.client_id FROM client_portal_users cpu 
    WHERE cpu.user_id = auth.uid() AND cpu.is_active = true
  )
);

-- Policy: Staff can create notifications for clients in their tenant
CREATE POLICY "Staff create notifications" ON client_notifications
FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());

-- Policy: Staff can view notifications in their tenant
CREATE POLICY "Staff view tenant notifications" ON client_notifications
FOR SELECT USING (tenant_id = get_user_tenant_id());

-- Enable realtime for client_notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_notifications;

-- Create helper function to create client notifications
CREATE OR REPLACE FUNCTION create_client_notification(
  p_client_id uuid,
  p_type varchar,
  p_title text,
  p_message text,
  p_urgent boolean DEFAULT false,
  p_action_required boolean DEFAULT false,
  p_related_type varchar DEFAULT NULL,
  p_related_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_notification_id uuid;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM clients WHERE id = p_client_id;
  
  IF v_tenant_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  INSERT INTO client_notifications (
    client_id, tenant_id, type, title, message, 
    urgent, action_required, related_entity_type, related_entity_id
  ) VALUES (
    p_client_id, v_tenant_id, p_type, p_title, p_message,
    p_urgent, p_action_required, p_related_type, p_related_id
  ) RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- Create trigger function to notify clients on hearing changes
CREATE OR REPLACE FUNCTION notify_client_on_hearing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_case_number varchar;
BEGIN
  -- Get client_id from the case
  SELECT client_id, case_number INTO v_client_id, v_case_number 
  FROM cases WHERE id = NEW.case_id;
  
  IF v_client_id IS NOT NULL AND NEW.status = 'Scheduled' THEN
    PERFORM create_client_notification(
      v_client_id,
      'hearing_reminder',
      'Hearing Scheduled',
      format('A hearing for case %s has been scheduled on %s', 
             v_case_number, 
             to_char(NEW.hearing_date, 'DD Mon YYYY')),
      false,
      true,
      'hearing',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for hearing notifications
CREATE TRIGGER trigger_notify_client_hearing
AFTER INSERT OR UPDATE OF status, hearing_date ON hearings
FOR EACH ROW EXECUTE FUNCTION notify_client_on_hearing();

-- Add updated_at trigger for client_portal_users
CREATE TRIGGER update_client_portal_users_updated_at
BEFORE UPDATE ON client_portal_users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION public.notify_admin_on_portal_upload()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $$
DECLARE
  v_assigned_to uuid;
  v_case_number varchar;
  v_client_name varchar;
BEGIN
  IF NEW.file_path IS NULL OR NOT NEW.file_path LIKE 'client-uploads/%' THEN
    RETURN NEW;
  END IF;

  IF NEW.case_id IS NOT NULL THEN
    SELECT assigned_to, case_number INTO v_assigned_to, v_case_number
    FROM cases WHERE id = NEW.case_id;
  END IF;

  IF NEW.client_id IS NOT NULL THEN
    SELECT display_name INTO v_client_name FROM clients WHERE id = NEW.client_id;
  END IF;

  IF v_assigned_to IS NOT NULL THEN
    INSERT INTO notifications (
      id, tenant_id, user_id, type, title, message,
      related_entity_type, related_entity_id,
      channels, status, read, created_at
    ) VALUES (
      gen_random_uuid(),
      NEW.tenant_id,
      v_assigned_to,
      'document_shared',
      'Client Portal: Document Uploaded',
      format('Client "%s" uploaded "%s" for case %s',
        COALESCE(v_client_name, 'Unknown'),
        NEW.file_name,
        COALESCE(v_case_number, 'N/A')),
      'document', NEW.id,
      ARRAY['in_app'], 'pending', false, now()
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_admin_on_portal_upload
  AFTER INSERT ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_on_portal_upload();

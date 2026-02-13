
-- Fix 1: Update hearing trigger to use case-insensitive status comparison
CREATE OR REPLACE FUNCTION public.notify_client_on_hearing()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_client_id uuid;
  v_case_number varchar;
BEGIN
  -- Get client_id from the case
  SELECT client_id, case_number INTO v_client_id, v_case_number 
  FROM cases WHERE id = NEW.case_id;
  
  IF v_client_id IS NOT NULL AND lower(NEW.status) = 'scheduled' THEN
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
$function$;

-- Fix 2: Add trigger function for document uploads
CREATE OR REPLACE FUNCTION public.notify_client_on_document()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_client_id uuid;
  v_case_number varchar;
BEGIN
  -- Only notify if document is linked to a case
  IF NEW.case_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get client_id from the case
  SELECT client_id, case_number INTO v_client_id, v_case_number 
  FROM cases WHERE id = NEW.case_id;
  
  IF v_client_id IS NOT NULL THEN
    PERFORM create_client_notification(
      v_client_id,
      'document',
      'New Document Uploaded',
      format('A new document "%s" has been uploaded for case %s', 
             NEW.file_name, 
             v_case_number),
      false,
      false,
      'document',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger on documents table
CREATE TRIGGER trigger_notify_client_document
  AFTER INSERT ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_client_on_document();

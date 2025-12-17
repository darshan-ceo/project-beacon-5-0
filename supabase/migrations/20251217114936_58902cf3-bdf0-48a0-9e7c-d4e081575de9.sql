-- Fix has_module_permission function: Cast both sides to TEXT to fix operator type mismatch
CREATE OR REPLACE FUNCTION public.has_module_permission(_user_id uuid, _module text, _action text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _has_permission BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM role_permissions rp
    JOIN user_roles ur ON CAST(rp.role AS TEXT) = CAST(ur.role AS TEXT)
    JOIN permissions p ON rp.permission_key = p.key
    WHERE ur.user_id = _user_id 
    AND ur.is_active = true
    AND p.module = _module
    AND p.action = _action
  ) INTO _has_permission;
  
  RETURN COALESCE(_has_permission, false);
END;
$function$;
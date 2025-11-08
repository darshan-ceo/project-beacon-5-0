-- Fix search_path on prevent_audit_log_modification function
-- Setting search_path prevents SQL injection and ensures function stability
-- Using CREATE OR REPLACE to update function without breaking trigger dependencies

CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable and cannot be modified or deleted. Operation: %', TG_OP;
  RETURN NULL;
END;
$$;
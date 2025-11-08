-- Phase 4: Audit Log Lockdown - Ensure Immutability
-- Audit logs must be append-only to maintain integrity and prevent tampering

-- Add table comment documenting the immutability requirement
COMMENT ON TABLE audit_log IS 
'Immutable audit trail. Only INSERT and SELECT operations are permitted. 
No UPDATE or DELETE policies exist by design to prevent tampering with audit history.
All changes to system state should be logged here for compliance and forensics.';

-- Create a trigger to prevent any updates or deletes at the database level
-- This provides an additional layer of protection beyond RLS
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable and cannot be modified or deleted. Operation: %', TG_OP;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply triggers to block UPDATE and DELETE operations
DROP TRIGGER IF EXISTS prevent_audit_log_update ON audit_log;
CREATE TRIGGER prevent_audit_log_update
  BEFORE UPDATE ON audit_log
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_modification();

DROP TRIGGER IF EXISTS prevent_audit_log_delete ON audit_log;
CREATE TRIGGER prevent_audit_log_delete
  BEFORE DELETE ON audit_log
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_modification();

-- Verify no UPDATE or DELETE policies exist (they should not)
-- RLS is already enabled on audit_log with only INSERT and SELECT policies
-- This ensures even database administrators cannot modify audit logs through normal operations

-- Add column comments to clarify immutability
COMMENT ON COLUMN audit_log.timestamp IS 
'Immutable timestamp set at record creation. Cannot be modified after insertion.';

COMMENT ON COLUMN audit_log.user_id IS 
'Immutable user ID of the actor. Captured at record creation and cannot be changed.';

COMMENT ON COLUMN audit_log.action_type IS 
'Type of action performed (create, update, delete, view, etc.). Immutable.';

COMMENT ON COLUMN audit_log.entity_type IS 
'Type of entity affected (case, client, document, etc.). Immutable.';

COMMENT ON COLUMN audit_log.entity_id IS 
'UUID of the affected entity. Immutable.';

-- Optional: Create a view for audit log analysis that includes user details
CREATE OR REPLACE VIEW audit_log_with_user_details
WITH (security_invoker=on)
AS
SELECT 
  al.id,
  al.timestamp,
  al.user_id,
  p.full_name as user_name,
  p.designation as user_designation,
  al.action_type,
  al.entity_type,
  al.entity_id,
  al.document_id,
  al.details,
  al.ip_address,
  al.user_agent,
  al.tenant_id
FROM audit_log al
LEFT JOIN profiles p ON al.user_id = p.id;

-- Enable security barrier on the audit view
ALTER VIEW audit_log_with_user_details SET (security_barrier = true);

COMMENT ON VIEW audit_log_with_user_details IS 
'Enriched audit log view with user details. Inherits immutability from audit_log table.';
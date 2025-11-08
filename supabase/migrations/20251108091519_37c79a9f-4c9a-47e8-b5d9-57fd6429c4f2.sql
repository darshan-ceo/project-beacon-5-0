-- Fix security definer issue on clients_directory view
-- Set security_invoker=on to respect RLS policies and use querying user's permissions

DROP VIEW IF EXISTS clients_directory;

CREATE OR REPLACE VIEW clients_directory
WITH (security_invoker=on)
AS
SELECT 
  id,
  tenant_id,
  display_name,
  city,
  state,
  status,
  client_group_id,
  created_at,
  updated_at,
  owner_id
FROM clients;

-- Enable security barrier to ensure RLS enforcement through the view
ALTER VIEW clients_directory SET (security_barrier = true);
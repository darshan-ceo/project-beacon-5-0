-- Move pg_net extension from public schema to extensions schema for better security isolation

-- Step 1: Drop the extension from public schema
DROP EXTENSION IF EXISTS pg_net;

-- Step 2: Create the extension in the extensions schema
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Step 3: Grant usage on the extensions schema to necessary roles
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
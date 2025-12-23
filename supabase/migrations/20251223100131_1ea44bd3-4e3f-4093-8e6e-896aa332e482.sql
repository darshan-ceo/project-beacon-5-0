-- Add portal_access JSONB column to clients table for storing portal credentials
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS portal_access JSONB DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.clients.portal_access IS 'Stores portal login credentials: {allowLogin: boolean, username: string, passwordHash: string, email: string}';
-- Add is_default column to document_folders table
ALTER TABLE document_folders 
ADD COLUMN is_default BOOLEAN DEFAULT false;

-- Update existing default folders if they exist
UPDATE document_folders 
SET is_default = true 
WHERE name IN ('Litigation Docs', 'Client Uploads', 'Internal Documents');

-- Add index for performance
CREATE INDEX idx_document_folders_is_default 
ON document_folders(is_default) 
WHERE is_default = true;

-- Add comment for documentation
COMMENT ON COLUMN document_folders.is_default IS 'Indicates if this is a system default folder that cannot be deleted';
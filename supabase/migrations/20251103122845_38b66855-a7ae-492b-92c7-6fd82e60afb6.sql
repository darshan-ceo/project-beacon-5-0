-- Step 1: Drop all foreign key constraints that reference document_folders
ALTER TABLE document_folders 
DROP CONSTRAINT IF EXISTS document_folders_parent_id_fkey;

ALTER TABLE documents 
DROP CONSTRAINT IF EXISTS documents_folder_id_fkey;

-- Step 2: Change document_folders.id from uuid to text
ALTER TABLE document_folders 
ALTER COLUMN id TYPE text USING id::text;

-- Step 3: Change document_folders.parent_id from uuid to text
ALTER TABLE document_folders 
ALTER COLUMN parent_id TYPE text USING parent_id::text;

-- Step 4: Change documents.folder_id from uuid to text
ALTER TABLE documents 
ALTER COLUMN folder_id TYPE text USING folder_id::text;

-- Step 5: Remove UUID default from document_folders.id
ALTER TABLE document_folders 
ALTER COLUMN id DROP DEFAULT;

-- Step 6: Recreate foreign key constraints
ALTER TABLE document_folders
ADD CONSTRAINT document_folders_parent_id_fkey 
FOREIGN KEY (parent_id) REFERENCES document_folders(id) ON DELETE CASCADE;

ALTER TABLE documents
ADD CONSTRAINT documents_folder_id_fkey 
FOREIGN KEY (folder_id) REFERENCES document_folders(id) ON DELETE SET NULL;
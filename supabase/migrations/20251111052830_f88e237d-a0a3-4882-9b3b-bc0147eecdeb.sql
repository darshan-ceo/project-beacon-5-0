-- Update document constraint to allow folder-only uploads
-- This allows documents to be uploaded to folders without requiring case/client/hearing/task linkage

ALTER TABLE documents DROP CONSTRAINT IF EXISTS at_least_one_link;

ALTER TABLE documents
  ADD CONSTRAINT at_least_one_link
  CHECK (
    case_id IS NOT NULL
    OR hearing_id IS NOT NULL
    OR task_id IS NOT NULL
    OR client_id IS NOT NULL
    OR folder_id IS NOT NULL
  );

COMMENT ON CONSTRAINT at_least_one_link ON documents IS 'Documents must be linked to at least one entity: case, hearing, task, client, or folder';
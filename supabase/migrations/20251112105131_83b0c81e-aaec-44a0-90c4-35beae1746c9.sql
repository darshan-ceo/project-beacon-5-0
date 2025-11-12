-- Add bundle_id column to tasks table to track which bundle generated each task
ALTER TABLE tasks 
ADD COLUMN bundle_id uuid REFERENCES task_bundles(id) ON DELETE SET NULL;

-- Add index for performance when checking bundle dependencies
CREATE INDEX idx_tasks_bundle_id ON tasks(bundle_id);

-- Add comment for documentation
COMMENT ON COLUMN tasks.bundle_id IS 'References the task bundle that generated this task (if auto-generated from a bundle)';
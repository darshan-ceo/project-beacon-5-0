-- Add demo tracking columns to transactional tables
ALTER TABLE cases ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS demo_batch_id VARCHAR(50);

ALTER TABLE hearings ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;
ALTER TABLE hearings ADD COLUMN IF NOT EXISTS demo_batch_id VARCHAR(50);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS demo_batch_id VARCHAR(50);

ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS demo_batch_id VARCHAR(50);

ALTER TABLE timeline_entries ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;
ALTER TABLE timeline_entries ADD COLUMN IF NOT EXISTS demo_batch_id VARCHAR(50);

ALTER TABLE communication_logs ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;
ALTER TABLE communication_logs ADD COLUMN IF NOT EXISTS demo_batch_id VARCHAR(50);

ALTER TABLE task_followups ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;
ALTER TABLE task_followups ADD COLUMN IF NOT EXISTS demo_batch_id VARCHAR(50);

ALTER TABLE stage_transitions ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;
ALTER TABLE stage_transitions ADD COLUMN IF NOT EXISTS demo_batch_id VARCHAR(50);

-- Add indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_cases_is_demo ON cases(is_demo) WHERE is_demo = true;
CREATE INDEX IF NOT EXISTS idx_cases_demo_batch ON cases(demo_batch_id) WHERE demo_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hearings_demo_batch ON hearings(demo_batch_id) WHERE demo_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_demo_batch ON tasks(demo_batch_id) WHERE demo_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_demo_batch ON documents(demo_batch_id) WHERE demo_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_timeline_entries_demo_batch ON timeline_entries(demo_batch_id) WHERE demo_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_communication_logs_demo_batch ON communication_logs(demo_batch_id) WHERE demo_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_task_followups_demo_batch ON task_followups(demo_batch_id) WHERE demo_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stage_transitions_demo_batch ON stage_transitions(demo_batch_id) WHERE demo_batch_id IS NOT NULL;
-- Backfill client_id for tasks that have a case_id but no client_id
-- This fixes auto-generated tasks that were created without proper client association
UPDATE tasks t
SET client_id = c.client_id
FROM cases c
WHERE t.case_id = c.id
  AND t.client_id IS NULL
  AND c.client_id IS NOT NULL;
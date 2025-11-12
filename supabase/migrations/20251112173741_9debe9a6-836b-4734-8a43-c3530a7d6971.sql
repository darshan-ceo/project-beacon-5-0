-- Phase 1: Add 'task_created' to timeline_entries type constraint
ALTER TABLE public.timeline_entries
DROP CONSTRAINT IF EXISTS timeline_entries_type_check;

ALTER TABLE public.timeline_entries
ADD CONSTRAINT timeline_entries_type_check
CHECK (type IN (
  'doc_saved', 
  'ai_draft_generated', 
  'case_created',
  'hearing_scheduled', 
  'task_created', 
  'task_completed',
  'stage_change', 
  'comment', 
  'deadline', 
  'case_assigned'
));
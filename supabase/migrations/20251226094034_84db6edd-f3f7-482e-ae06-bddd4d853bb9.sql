-- Add missing fields used by the app to task follow-ups
ALTER TABLE public.task_followups
  ADD COLUMN IF NOT EXISTS remarks text,
  ADD COLUMN IF NOT EXISTS hours_logged numeric,
  ADD COLUMN IF NOT EXISTS next_follow_up_date date,
  ADD COLUMN IF NOT EXISTS next_actions text,
  ADD COLUMN IF NOT EXISTS blockers text,
  ADD COLUMN IF NOT EXISTS support_needed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS escalation_requested boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS attachments jsonb;
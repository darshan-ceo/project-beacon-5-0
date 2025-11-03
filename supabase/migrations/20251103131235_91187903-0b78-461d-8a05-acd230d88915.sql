-- Phase 3: Set Replica Identity for Core Tables
-- Tables are already in supabase_realtime publication, just need to set replica identity

-- Set replica identity to FULL for complete row data in realtime updates
ALTER TABLE public.cases REPLICA IDENTITY FULL;
ALTER TABLE public.clients REPLICA IDENTITY FULL;
ALTER TABLE public.hearings REPLICA IDENTITY FULL;
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER TABLE public.documents REPLICA IDENTITY FULL;
ALTER TABLE public.employees REPLICA IDENTITY FULL;
ALTER TABLE public.courts REPLICA IDENTITY FULL;
ALTER TABLE public.judges REPLICA IDENTITY FULL;
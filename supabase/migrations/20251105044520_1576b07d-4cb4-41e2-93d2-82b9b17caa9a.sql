-- Enable required extensions for background jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule Background Job #1: SLA & Overdue Check (Every 15 minutes)
SELECT cron.schedule(
  'sla-overdue-check-15min',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://myncxddatwvtyiioqekh.supabase.co/functions/v1/check-sla-and-overdue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-api-key', current_setting('app.settings.lovable_api_key', true)
    ),
    body := jsonb_build_object('time', now()::text)
  ) as request_id;
  $$
);

-- Schedule Background Job #2: Hearing Reminders (Daily at 8:00 AM)
SELECT cron.schedule(
  'hearing-reminders-daily-8am',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://myncxddatwvtyiioqekh.supabase.co/functions/v1/send-hearing-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-api-key', current_setting('app.settings.lovable_api_key', true)
    ),
    body := jsonb_build_object('time', now()::text)
  ) as request_id;
  $$
);

-- Schedule Background Job #3: Analytics Snapshot (Daily at 11:59 PM)
SELECT cron.schedule(
  'analytics-snapshot-daily-2359',
  '59 23 * * *',
  $$
  SELECT net.http_post(
    url := 'https://myncxddatwvtyiioqekh.supabase.co/functions/v1/analytics-snapshot',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-api-key', current_setting('app.settings.lovable_api_key', true)
    ),
    body := jsonb_build_object('time', now()::text)
  ) as request_id;
  $$
);

-- Schedule Background Job #4: Upcoming Deadlines Alert (Daily at 9:00 AM)
SELECT cron.schedule(
  'deadline-alerts-daily-9am',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://myncxddatwvtyiioqekh.supabase.co/functions/v1/check-upcoming-deadlines',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-api-key', current_setting('app.settings.lovable_api_key', true)
    ),
    body := jsonb_build_object('time', now()::text)
  ) as request_id;
  $$
);

-- Schedule Background Job #5: Automation Health Check (Daily at 7:00 AM)
SELECT cron.schedule(
  'automation-health-daily-7am',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url := 'https://myncxddatwvtyiioqekh.supabase.co/functions/v1/automation-health-check',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-api-key', current_setting('app.settings.lovable_api_key', true)
    ),
    body := jsonb_build_object('time', now()::text)
  ) as request_id;
  $$
);
# Integrating Background Jobs - Developer Guide

**Audience:** Software Engineers, Backend Developers  
**Last Updated:** January 2025

---

## Creating New Background Jobs

### Step 1: Create Edge Function

```typescript
// supabase/functions/my-new-job/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader || authHeader !== `Bearer ${apiKey}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Initialize Supabase with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('[Job] Starting my-new-job execution');
    const startTime = Date.now();

    // YOUR BUSINESS LOGIC HERE
    const { data, error } = await supabase
      .from('your_table')
      .select('*')
      .eq('some_condition', true);

    if (error) throw error;

    // Process data
    const results = await processData(data);

    // Audit logging
    await supabase.from('audit_log').insert({
      action_type: 'background_job_execution',
      entity_type: 'background_job',
      details: {
        job_name: 'my-new-job',
        status: 'success',
        records_processed: data.length,
        execution_time_ms: Date.now() - startTime
      }
    });

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Job] Error:', error);
    
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### Step 2: Deploy Edge Function

```bash
supabase functions deploy my-new-job --no-verify-jwt
```

### Step 3: Create Cron Job

```sql
SELECT cron.schedule(
  'my-new-job-daily-10am',
  '0 10 * * *',  -- Daily at 10 AM
  $$
  SELECT net.http_post(
    url:='https://myncxddatwvtyiioqekh.supabase.co/functions/v1/my-new-job',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer <ANON_KEY>"}'::jsonb,
    body:=concat('{"executedAt": "', now(), '"}')::jsonb
  ) as request_id;
  $$
);
```

### Step 4: Register in Monitoring UI

```typescript
// src/components/admin/BackgroundJobsMonitor.tsx
const backgroundJobs: BackgroundJob[] = [
  // ... existing jobs
  {
    name: 'My New Job',
    functionName: 'my-new-job',
    schedule: '0 10 * * *',
    description: 'Description of what this job does',
    lastRun: null,
    status: 'pending'
  }
];
```

---

## Best Practices

### Idempotency

Jobs should be safe to run multiple times:

```typescript
// ❌ BAD: Not idempotent
await supabase.from('tasks').update({ reminded: true });

// ✅ GOOD: Idempotent with WHERE clause
await supabase
  .from('tasks')
  .update({ reminded: true, reminded_at: new Date() })
  .eq('reminded', false)
  .lt('due_date', tomorrow);
```

### Error Handling

```typescript
try {
  const result = await riskyOperation();
  await logSuccess(result);
} catch (error) {
  console.error('[Job] Error:', error);
  
  // Log failure for monitoring
  await supabase.from('audit_log').insert({
    action_type: 'background_job_execution',
    details: {
      job_name: 'my-job',
      status: 'failed',
      error_message: error.message,
      error_stack: error.stack
    }
  });
  
  // Return 500 to trigger cron retry
  throw error;
}
```

### Batch Processing

```typescript
const BATCH_SIZE = 100;
let processed = 0;

while (true) {
  const { data: batch } = await supabase
    .from('tasks')
    .select('*')
    .range(processed, processed + BATCH_SIZE - 1);
    
  if (!batch || batch.length === 0) break;
  
  await Promise.all(batch.map(task => processTask(task)));
  processed += batch.length;
  
  console.log(`[Job] Processed ${processed} records`);
}
```

---

## Testing Background Jobs

### Local Testing

```bash
# Start Supabase locally
supabase start

# Deploy function locally
supabase functions serve my-new-job

# Test with curl
curl -i --location --request POST 'http://localhost:54321/functions/v1/my-new-job' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"executedAt": "2025-01-15T10:00:00Z"}'
```

### Production Testing

```typescript
// Use Supabase client
import { supabase } from '@/integrations/supabase/client';

const { data, error } = await supabase.functions.invoke('my-new-job', {
  body: { executedAt: new Date().toISOString() }
});

console.log('Result:', data);
```

---

## Code Examples

See [BACKGROUND_JOBS_SYSTEM.md](./BACKGROUND_JOBS_SYSTEM.md) for complete examples.

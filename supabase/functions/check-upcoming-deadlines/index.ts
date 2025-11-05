import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.78.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[Deadline Check] Starting upcoming deadlines check');

    // Verify API key
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    const authHeader = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!apiKey || authHeader !== apiKey) {
      console.log('[Deadline Check] Unauthorized access attempt');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const results = {
      upcomingTasks: 0,
      upcomingHearings: 0,
      alertsSent: 0,
      errors: [] as string[],
    };

    // Step 1: Find tasks due within 24 hours
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select(`
        id, title, due_date, priority, assigned_to_id, case_id, tenant_id,
        cases:case_id (case_number, title)
      `)
      .not('status', 'in', '(Completed,Cancelled)')
      .gte('due_date', now.toISOString())
      .lte('due_date', next24Hours.toISOString())
      .order('due_date', { ascending: true });

    if (tasksError) {
      console.error('[Deadline Check] Error fetching tasks:', tasksError);
      results.errors.push(`Tasks: ${tasksError.message}`);
    } else if (tasks && tasks.length > 0) {
      console.log(`[Deadline Check] Found ${tasks.length} tasks due within 24 hours`);
      results.upcomingTasks = tasks.length;

      // Group tasks by assigned user
      const tasksByUser = new Map<string, typeof tasks>();
      for (const task of tasks) {
        if (task.assigned_to_id) {
          if (!tasksByUser.has(task.assigned_to_id)) {
            tasksByUser.set(task.assigned_to_id, []);
          }
          tasksByUser.get(task.assigned_to_id)!.push(task);
        }
      }

      // Log deadline alerts
      for (const [userId, userTasks] of tasksByUser) {
        await supabase.from('audit_log').insert({
          tenant_id: userTasks[0].tenant_id,
          entity_type: 'task',
          entity_id: userTasks.map(t => t.id).join(','),
          action_type: 'background_job',
          action: 'deadline_alert_24h',
          performed_by: 'system',
          details: {
            user_id: userId,
            task_count: userTasks.length,
            tasks: userTasks.map(t => ({
              id: t.id,
              title: t.title,
              due_date: t.due_date,
              priority: t.priority,
              case_number: t.cases?.case_number,
            })),
          },
        });
        results.alertsSent++;
      }
    }

    // Step 2: Find hearings within 24 hours
    const { data: hearings, error: hearingsError } = await supabase
      .from('hearings')
      .select(`
        id, hearing_date, court_name, case_id, tenant_id, status,
        cases:case_id (case_number, title, assigned_to)
      `)
      .eq('status', 'Scheduled')
      .gte('hearing_date', now.toISOString())
      .lte('hearing_date', next24Hours.toISOString())
      .order('hearing_date', { ascending: true });

    if (hearingsError) {
      console.error('[Deadline Check] Error fetching hearings:', hearingsError);
      results.errors.push(`Hearings: ${hearingsError.message}`);
    } else if (hearings && hearings.length > 0) {
      console.log(`[Deadline Check] Found ${hearings.length} hearings within 24 hours`);
      results.upcomingHearings = hearings.length;

      // Log hearing alerts
      for (const hearing of hearings) {
        await supabase.from('audit_log').insert({
          tenant_id: hearing.tenant_id,
          entity_type: 'hearing',
          entity_id: hearing.id,
          action_type: 'background_job',
          action: 'hearing_deadline_alert_24h',
          performed_by: 'system',
          details: {
            hearing_date: hearing.hearing_date,
            court_name: hearing.court_name,
            case_number: hearing.cases?.case_number,
            case_title: hearing.cases?.title,
            assigned_to: hearing.cases?.assigned_to,
          },
        });
        results.alertsSent++;
      }
    }

    console.log('[Deadline Check] Completed:', results);

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Deadline Check] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false,
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.78.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

interface Task {
  id: string;
  title: string;
  due_date: string;
  priority: string;
  status: string;
  assigned_to_id: string;
  case_id: string;
  tenant_id: string;
  case_title?: string;
  case_number?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[SLA Check] Starting SLA and overdue task check');

    // Verify API key for security
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    const authHeader = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!apiKey || authHeader !== apiKey) {
      console.log('[SLA Check] Unauthorized access attempt');
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

    const results = {
      overdueTasks: 0,
      slaWarnings: 0,
      slaCritical: 0,
      tasksUpdated: 0,
      errors: [] as string[],
    };

    // Step 1: Find overdue tasks
    const { data: overdueTasks, error: overdueError } = await supabase
      .from('tasks')
      .select(`
        id, title, due_date, priority, status, assigned_to_id, case_id, tenant_id,
        cases:case_id (title, case_number)
      `)
      .not('status', 'in', '(Completed,Cancelled,Overdue)')
      .lt('due_date', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('due_date', { ascending: true });

    if (overdueError) {
      console.error('[SLA Check] Error fetching overdue tasks:', overdueError);
      results.errors.push(`Overdue fetch: ${overdueError.message}`);
    } else if (overdueTasks && overdueTasks.length > 0) {
      console.log(`[SLA Check] Found ${overdueTasks.length} overdue tasks`);
      results.overdueTasks = overdueTasks.length;

      // Update tasks to Overdue status
      for (const task of overdueTasks) {
        const { error: updateError } = await supabase
          .from('tasks')
          .update({ status: 'Overdue' })
          .eq('id', task.id);

        if (updateError) {
          console.error(`[SLA Check] Failed to update task ${task.id}:`, updateError);
          results.errors.push(`Update task ${task.id}: ${updateError.message}`);
        } else {
          results.tasksUpdated++;

          // Log to audit_log
          await supabase.from('audit_log').insert({
            tenant_id: task.tenant_id,
            entity_type: 'task',
            entity_id: task.id,
            action_type: 'background_job',
            action: 'status_updated_to_overdue',
            performed_by: 'system',
            details: {
              task_title: task.title,
              due_date: task.due_date,
              priority: task.priority,
              case_id: task.case_id,
            },
          });
        }
      }
    }

    // Step 2: Check SLA thresholds
    const slaThresholds = {
      Critical: 8,   // 8 hours
      High: 48,      // 48 hours
      Medium: 120,   // 120 hours (5 days)
      Low: 240,      // 240 hours (10 days)
    };

    const { data: upcomingTasks, error: upcomingError } = await supabase
      .from('tasks')
      .select(`
        id, title, due_date, priority, status, assigned_to_id, case_id, tenant_id,
        cases:case_id (title, case_number)
      `)
      .not('status', 'in', '(Completed,Cancelled,Overdue)')
      .gte('due_date', new Date().toISOString());

    if (upcomingError) {
      console.error('[SLA Check] Error fetching upcoming tasks:', upcomingError);
      results.errors.push(`Upcoming fetch: ${upcomingError.message}`);
    } else if (upcomingTasks) {
      const now = new Date().getTime();

      for (const task of upcomingTasks) {
        const dueDate = new Date(task.due_date).getTime();
        const hoursUntilDue = (dueDate - now) / (1000 * 60 * 60);
        const threshold = slaThresholds[task.priority as keyof typeof slaThresholds] || 240;

        if (hoursUntilDue <= threshold && hoursUntilDue > 0) {
          const severity = hoursUntilDue <= threshold * 0.25 ? 'critical' : 'warning';
          
          if (severity === 'critical') {
            results.slaCritical++;
          } else {
            results.slaWarnings++;
          }

          // Log SLA alert
          await supabase.from('audit_log').insert({
            tenant_id: task.tenant_id,
            entity_type: 'task',
            entity_id: task.id,
            action_type: 'background_job',
            action: `sla_${severity}`,
            performed_by: 'system',
            details: {
              task_title: task.title,
              due_date: task.due_date,
              priority: task.priority,
              hours_until_due: Math.round(hoursUntilDue * 10) / 10,
              threshold_hours: threshold,
              case_id: task.case_id,
            },
          });

          console.log(`[SLA Check] ${severity.toUpperCase()}: Task "${task.title}" (${task.priority}) due in ${Math.round(hoursUntilDue)}h`);
        }
      }
    }

    console.log('[SLA Check] Completed:', results);

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[SLA Check] Unexpected error:', error);
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

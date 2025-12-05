/**
 * Analytics Snapshot Edge Function
 * Captures daily snapshots of key metrics for historical trend analysis
 * Should be triggered daily via cron job
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

interface TenantMetrics {
  case_count: number;
  active_cases: number;
  completed_cases: number;
  task_completion_rate: number;
  hearing_count: number;
  compliance_rate: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[Analytics Snapshot] Starting analytics snapshot');

    // Verify API key for security
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    const authHeader = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!apiKey || authHeader !== apiKey) {
      console.log('[Analytics Snapshot] Unauthorized access attempt');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all active tenants
    const { data: tenants, error: tenantsError } = await supabaseAdmin
      .from('tenants')
      .select('id, name')
      .eq('is_active', true);

    if (tenantsError) throw tenantsError;

    const results = [];
    const today = new Date().toISOString().split('T')[0];

    // Process each tenant
    for (const tenant of tenants || []) {
      console.log(`Processing analytics for tenant: ${tenant.name} (${tenant.id})`);

      // Calculate metrics for this tenant
      const metrics = await calculateTenantMetrics(supabaseAdmin, tenant.id);

      // Store individual metric snapshots
      const snapshots = [
        {
          tenant_id: tenant.id,
          snapshot_date: today,
          metric_type: 'case_count',
          metric_value: metrics.case_count,
        },
        {
          tenant_id: tenant.id,
          snapshot_date: today,
          metric_type: 'active_cases',
          metric_value: metrics.active_cases,
        },
        {
          tenant_id: tenant.id,
          snapshot_date: today,
          metric_type: 'task_completion',
          metric_value: metrics.task_completion_rate,
        },
        {
          tenant_id: tenant.id,
          snapshot_date: today,
          metric_type: 'hearing_count',
          metric_value: metrics.hearing_count,
        },
        {
          tenant_id: tenant.id,
          snapshot_date: today,
          metric_type: 'compliance_rate',
          metric_value: metrics.compliance_rate,
        },
        {
          tenant_id: tenant.id,
          snapshot_date: today,
          metric_type: 'daily_summary',
          metric_value: metrics,
        },
      ];

      // Insert snapshots (use upsert to handle duplicates)
      const { error: insertError } = await supabaseAdmin
        .from('analytics_snapshots')
        .upsert(snapshots, { 
          onConflict: 'tenant_id,snapshot_date,metric_type',
          ignoreDuplicates: false 
        });

      if (insertError) {
        console.error(`Error inserting snapshots for tenant ${tenant.id}:`, insertError);
        results.push({ tenant_id: tenant.id, status: 'error', error: insertError.message });
      } else {
        results.push({ tenant_id: tenant.id, status: 'success', metrics });
      }
    }

    console.log('[Analytics Snapshot] Completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        date: today,
        processed: results.length,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in analytics-snapshot function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

/**
 * Calculate comprehensive metrics for a tenant
 */
async function calculateTenantMetrics(
  supabase: any,
  tenantId: string
): Promise<TenantMetrics> {
  // Fetch cases
  const { data: cases, error: casesError } = await supabase
    .from('cases')
    .select('status, created_at')
    .eq('tenant_id', tenantId);

  if (casesError) {
    console.error('Error fetching cases:', casesError);
  }

  const case_count = cases?.length || 0;
  const active_cases = cases?.filter((c: any) => c.status === 'Active').length || 0;
  const completed_cases = cases?.filter((c: any) => c.status === 'Completed').length || 0;

  // Fetch tasks
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('status')
    .eq('tenant_id', tenantId);

  if (tasksError) {
    console.error('Error fetching tasks:', tasksError);
  }

  const total_tasks = tasks?.length || 0;
  const completed_tasks = tasks?.filter((t: any) => t.status === 'Completed').length || 0;
  const task_completion_rate = total_tasks > 0 
    ? Math.round((completed_tasks / total_tasks) * 100) 
    : 0;

  // Fetch hearings
  const { data: hearings, error: hearingsError } = await supabase
    .from('hearings')
    .select('id')
    .eq('tenant_id', tenantId);

  if (hearingsError) {
    console.error('Error fetching hearings:', hearingsError);
  }

  const hearing_count = hearings?.length || 0;

  // Calculate compliance rate (cases within 30-day timeline)
  const onTimeCases = cases?.filter((c: any) => {
    const age = Math.floor(
      (new Date().getTime() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    return age <= 30;
  }).length || 0;

  const compliance_rate = case_count > 0 
    ? Math.round((onTimeCases / case_count) * 100) 
    : 0;

  return {
    case_count,
    active_cases,
    completed_cases,
    task_completion_rate,
    hearing_count,
    compliance_rate,
  };
}

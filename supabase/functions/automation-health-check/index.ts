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
    console.log('[Automation Health] Starting automation health check');

    // Verify API key
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    const authHeader = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!apiKey || authHeader !== apiKey) {
      console.log('[Automation Health] Unauthorized access attempt');
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

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Fetch automation logs from last 24 hours
    const { data: logs, error: logsError } = await supabase
      .from('automation_logs')
      .select('*')
      .gte('timestamp', twentyFourHoursAgo)
      .order('timestamp', { ascending: false });

    if (logsError) {
      console.error('[Automation Health] Error fetching logs:', logsError);
      return new Response(
        JSON.stringify({ error: logsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const metrics = {
      totalExecutions: logs?.length || 0,
      successCount: 0,
      partialCount: 0,
      failedCount: 0,
      successRate: 0,
      executionTimes: [] as number[],
      avgExecutionTime: 0,
      failingRules: [] as Array<{ ruleId: string; ruleName: string; failures: number; lastError?: string }>,
      topRules: [] as Array<{ ruleId: string; ruleName: string; executions: number }>,
    };

    if (logs && logs.length > 0) {
      // Calculate basic metrics
      const ruleStats = new Map<string, { 
        name: string; 
        executions: number; 
        failures: number;
        lastError?: string;
      }>();

      for (const log of logs) {
        // Count status
        if (log.status === 'success') metrics.successCount++;
        else if (log.status === 'partial') metrics.partialCount++;
        else if (log.status === 'failed') metrics.failedCount++;

        // Track execution times
        const totalTime = log.actions?.reduce((sum: number, action: any) => 
          sum + (action.duration_ms || 0), 0) || 0;
        if (totalTime > 0) metrics.executionTimes.push(totalTime);

        // Track per-rule stats
        if (!ruleStats.has(log.rule_id)) {
          ruleStats.set(log.rule_id, {
            name: log.rule_name,
            executions: 0,
            failures: 0,
          });
        }
        const stats = ruleStats.get(log.rule_id)!;
        stats.executions++;
        if (log.status === 'failed') {
          stats.failures++;
          stats.lastError = log.actions?.find((a: any) => a.status === 'failed')?.error;
        }
      }

      // Calculate success rate
      metrics.successRate = metrics.totalExecutions > 0
        ? Math.round((metrics.successCount / metrics.totalExecutions) * 100)
        : 0;

      // Calculate average execution time
      if (metrics.executionTimes.length > 0) {
        metrics.avgExecutionTime = Math.round(
          metrics.executionTimes.reduce((a, b) => a + b, 0) / metrics.executionTimes.length
        );
      }

      // Identify failing rules (>30% failure rate)
      for (const [ruleId, stats] of ruleStats) {
        const failureRate = (stats.failures / stats.executions) * 100;
        if (failureRate > 30) {
          metrics.failingRules.push({
            ruleId,
            ruleName: stats.name,
            failures: stats.failures,
            lastError: stats.lastError,
          });
        }
      }

      // Get top 5 most-triggered rules
      metrics.topRules = Array.from(ruleStats.entries())
        .sort((a, b) => b[1].executions - a[1].executions)
        .slice(0, 5)
        .map(([ruleId, stats]) => ({
          ruleId,
          ruleName: stats.name,
          executions: stats.executions,
        }));
    }

    // Get active tenants for report
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('is_active', true);

    if (tenantsError) {
      console.error('[Automation Health] Error fetching tenants:', tenantsError);
    }

    // Store health snapshot in analytics
    for (const tenant of tenants || []) {
      await supabase.from('analytics_snapshots').insert({
        tenant_id: tenant.id,
        snapshot_date: new Date().toISOString().split('T')[0],
        metric_name: 'automation_health',
        metric_value: metrics.successRate,
        metadata: {
          total_executions: metrics.totalExecutions,
          success_count: metrics.successCount,
          failed_count: metrics.failedCount,
          avg_execution_time_ms: metrics.avgExecutionTime,
          failing_rules: metrics.failingRules,
          top_rules: metrics.topRules,
        },
      });
    }

    console.log('[Automation Health] Completed:', metrics);

    // Alert if success rate is below 70%
    if (metrics.successRate < 70 && metrics.totalExecutions > 0) {
      console.warn(`[Automation Health] LOW SUCCESS RATE: ${metrics.successRate}%`);
      
      // Log critical alert
      await supabase.from('audit_log').insert({
        tenant_id: tenants?.[0]?.id,
        entity_type: 'automation',
        entity_id: 'health_check',
        action_type: 'background_job',
        action: 'health_check_critical',
        performed_by: 'system',
        details: {
          success_rate: metrics.successRate,
          total_executions: metrics.totalExecutions,
          failed_count: metrics.failedCount,
          failing_rules: metrics.failingRules,
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        metrics,
        health_status: metrics.successRate >= 90 ? 'excellent' 
          : metrics.successRate >= 70 ? 'good'
          : metrics.successRate >= 50 ? 'warning'
          : 'critical',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Automation Health] Unexpected error:', error);
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

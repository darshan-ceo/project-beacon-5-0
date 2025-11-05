import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Clock, PlayCircle, CheckCircle, AlertCircle, Activity } from 'lucide-react';

interface BackgroundJob {
  name: string;
  function_name: string;
  schedule: string;
  description: string;
  last_run?: string;
  status?: 'success' | 'failed' | 'running' | 'pending';
}

export function BackgroundJobsMonitor() {
  const { toast } = useToast();
  const [jobs] = useState<BackgroundJob[]>([
    {
      name: 'SLA & Overdue Check',
      function_name: 'check-sla-and-overdue',
      schedule: 'Every 15 minutes',
      description: 'Monitors task SLAs and detects overdue tasks',
    },
    {
      name: 'Hearing Reminders',
      function_name: 'send-hearing-reminders',
      schedule: 'Daily at 8:00 AM',
      description: 'Sends email/WhatsApp reminders for upcoming hearings',
    },
    {
      name: 'Analytics Snapshot',
      function_name: 'analytics-snapshot',
      schedule: 'Daily at 11:59 PM',
      description: 'Captures daily metrics for trend analysis',
    },
    {
      name: 'Deadline Alerts',
      function_name: 'check-upcoming-deadlines',
      schedule: 'Daily at 9:00 AM',
      description: 'Alerts users about tasks/hearings due within 24 hours',
    },
    {
      name: 'Automation Health Check',
      function_name: 'automation-health-check',
      schedule: 'Daily at 7:00 AM',
      description: 'Monitors automation rule execution and reports issues',
    },
  ]);

  const [executing, setExecuting] = useState<Set<string>>(new Set());
  const [lastRuns, setLastRuns] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    fetchLastRuns();
  }, []);

  const fetchLastRuns = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .eq('action_type', 'background_job')
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) throw error;

      const runMap = new Map();
      for (const log of data || []) {
        const details = log.details as any;
        const jobKey = details?.function_name || log.entity_id;
        if (!runMap.has(jobKey)) {
          runMap.set(jobKey, log);
        }
      }
      setLastRuns(runMap);
    } catch (error) {
      console.error('Error fetching job history:', error);
    }
  };

  const executeJob = async (job: BackgroundJob) => {
    setExecuting(prev => new Set(prev).add(job.function_name));
    
    try {
      const { data, error } = await supabase.functions.invoke(job.function_name, {
        body: { manual_trigger: true, time: new Date().toISOString() },
      });

      if (error) throw error;

      toast({
        title: '✅ Job Executed',
        description: `${job.name} completed successfully`,
      });

      fetchLastRuns();
    } catch (error: any) {
      console.error(`Error executing ${job.name}:`, error);
      toast({
        title: '❌ Job Failed',
        description: error.message || 'Failed to execute job',
        variant: 'destructive',
      });
    } finally {
      setExecuting(prev => {
        const next = new Set(prev);
        next.delete(job.function_name);
        return next;
      });
    }
  };

  const getStatusBadge = (job: BackgroundJob) => {
    const lastRun = Array.from(lastRuns.values()).find(log => {
      const details = log.details as any;
      return details?.function_name === job.function_name || 
        log.entity_id?.includes(job.function_name.replace('check-', '').replace('-', '_'));
    });

    if (executing.has(job.function_name)) {
      return <Badge variant="outline" className="bg-blue-500/10 text-blue-600"><Activity className="h-3 w-3 mr-1 animate-spin" />Running</Badge>;
    }

    if (!lastRun) {
      return <Badge variant="outline" className="bg-gray-500/10"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }

    const details = lastRun.details as any;
    if (details?.success === false || details?.results?.errors?.length > 0) {
      return <Badge variant="outline" className="bg-red-500/10 text-red-600"><AlertCircle className="h-3 w-3 mr-1" />Failed</Badge>;
    }

    return <Badge variant="outline" className="bg-green-500/10 text-green-600"><CheckCircle className="h-3 w-3 mr-1" />Success</Badge>;
  };

  const getLastRunTime = (job: BackgroundJob) => {
    const lastRun = Array.from(lastRuns.values()).find(log => {
      const details = log.details as any;
      return details?.function_name === job.function_name || 
        log.entity_id?.includes(job.function_name.replace('check-', '').replace('-', '_'));
    });

    if (!lastRun) return 'Never executed';

    const date = new Date(lastRun.timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return `${Math.floor(diffMinutes / 1440)}d ago`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Background Jobs Monitor</h2>
        <p className="text-muted-foreground">Server-side scheduled tasks running 24/7</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {jobs.map((job) => (
          <Card key={job.function_name}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{job.name}</CardTitle>
                  <CardDescription className="mt-1">{job.description}</CardDescription>
                </div>
                {getStatusBadge(job)}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Schedule:</span>
                <span className="font-medium">{job.schedule}</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Last Run:</span>
                <span className="font-medium">{getLastRunTime(job)}</span>
              </div>

              <Button
                onClick={() => executeJob(job)}
                disabled={executing.has(job.function_name)}
                className="w-full"
                size="sm"
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                {executing.has(job.function_name) ? 'Running...' : 'Run Now'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
          <CardDescription>Background job infrastructure status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Jobs:</span>
              <span className="font-medium">{jobs.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Execution Method:</span>
              <span className="font-medium">Supabase pg_cron</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Availability:</span>
              <span className="font-medium text-green-600">24/7 Server-Side</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Authentication:</span>
              <span className="font-medium">API Key Protected</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

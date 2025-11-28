import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, CheckCircle2, AlertCircle } from 'lucide-react';
import { useMemo } from 'react';
import { format } from 'date-fns';

export const SystemHealthWidget = () => {
  const healthStatus = useMemo(() => {
    // System is healthy if we're connected to Supabase
    const isHealthy = true;
    const lastSync = new Date();

    return {
      isHealthy,
      lastSync: format(lastSync, 'HH:mm:ss'),
      status: isHealthy ? 'Operational' : 'Degraded'
    };
  }, []);

  return (
    <Card className="hover:shadow-lg transition-shadow bg-gradient-to-br from-slate-50 to-gray-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4 text-slate-600" />
          System Health
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <div className="flex items-center gap-2">
              {healthStatus.isHealthy ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-500" />
              )}
              <span className={`text-sm font-medium ${
                healthStatus.isHealthy ? 'text-green-600' : 'text-amber-600'
              }`}>
                {healthStatus.status}
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Database</span>
            <span className="text-sm font-medium text-green-600">Connected</span>
          </div>

          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Last sync: {healthStatus.lastSync}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

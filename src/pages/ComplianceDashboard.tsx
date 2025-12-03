import React from 'react';
import { RefreshCw, AlertTriangle, Clock, CalendarClock, TrendingUp, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useComplianceDashboard } from '@/hooks/useComplianceDashboard';
import { DeadlineDistributionChart } from '@/components/compliance/DeadlineDistributionChart';
import { DeadlinesByAuthorityChart } from '@/components/compliance/DeadlinesByAuthorityChart';
import { ComplianceTrendChart } from '@/components/compliance/ComplianceTrendChart';
import { UrgentDeadlinesTable } from '@/components/compliance/UrgentDeadlinesTable';
import { RecentBreachesCard } from '@/components/compliance/RecentBreachesCard';
import { cn } from '@/lib/utils';

export const ComplianceDashboard: React.FC = () => {
  const {
    summary,
    deadlinesByStatus,
    deadlinesByAuthority,
    trend,
    urgentDeadlines,
    recentBreaches,
    isLoading,
    refetchAll,
  } = useComplianceDashboard();

  const lastUpdated = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[350px]" />
          <Skeleton className="h-[350px]" />
        </div>
      </div>
    );
  }

  const kpiCards = [
    {
      title: 'Total Pending',
      value: summary?.totalPending || 0,
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
      borderColor: 'border-blue-200 dark:border-blue-900',
    },
    {
      title: 'Overdue',
      value: summary?.overdue || 0,
      icon: AlertTriangle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      borderColor: 'border-destructive/30',
      urgent: (summary?.overdue || 0) > 0,
    },
    {
      title: 'Due This Week',
      value: (summary?.dueToday || 0) + (summary?.dueThisWeek || 0),
      icon: CalendarClock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 dark:bg-amber-950/30',
      borderColor: 'border-amber-200 dark:border-amber-900',
    },
    {
      title: 'Compliance Rate',
      value: `${summary?.complianceRate || 0}%`,
      icon: CheckCircle2,
      color: (summary?.complianceRate || 0) >= 80 ? 'text-green-600' : 'text-amber-600',
      bgColor: (summary?.complianceRate || 0) >= 80 
        ? 'bg-green-50 dark:bg-green-950/30' 
        : 'bg-amber-50 dark:bg-amber-950/30',
      borderColor: (summary?.complianceRate || 0) >= 80 
        ? 'border-green-200 dark:border-green-900'
        : 'border-amber-200 dark:border-amber-900',
      progress: summary?.complianceRate || 0,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Compliance Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Monitor statutory deadlines and compliance status across all cases
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            Last updated: {lastUpdated}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={refetchAll}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => (
          <Card 
            key={kpi.title}
            className={cn(
              'border transition-all hover:shadow-md',
              kpi.borderColor,
              kpi.urgent && 'animate-pulse'
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">{kpi.title}</p>
                  <p className={cn('text-3xl font-bold mt-1', kpi.color)}>
                    {kpi.value}
                  </p>
                  {kpi.progress !== undefined && (
                    <Progress 
                      value={kpi.progress} 
                      className="mt-2 h-2"
                    />
                  )}
                </div>
                <div className={cn('p-3 rounded-full', kpi.bgColor)}>
                  <kpi.icon className={cn('h-6 w-6', kpi.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DeadlineDistributionChart data={deadlinesByStatus} />
        <DeadlinesByAuthorityChart data={deadlinesByAuthority} />
      </div>

      {/* Compliance Trend */}
      <ComplianceTrendChart data={trend} />

      {/* Urgent Deadlines Table */}
      <UrgentDeadlinesTable data={urgentDeadlines} />

      {/* Recent Breaches */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Space for additional content if needed */}
        </div>
        <RecentBreachesCard data={recentBreaches} />
      </div>
    </div>
  );
};

export default ComplianceDashboard;

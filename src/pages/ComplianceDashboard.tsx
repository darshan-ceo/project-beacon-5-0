import React, { useState } from 'react';
import { RefreshCw, AlertTriangle, Clock, CalendarClock, TrendingUp, CheckCircle2, Send, Loader2, FileDown, Settings, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useComplianceDashboard } from '@/hooks/useComplianceDashboard';
import { useDeadlineNotifications } from '@/hooks/useDeadlineNotifications';
import { useAppState } from '@/contexts/AppStateContext';
import { DeadlineDistributionChart } from '@/components/compliance/DeadlineDistributionChart';
import { DeadlinesByAuthorityChart } from '@/components/compliance/DeadlinesByAuthorityChart';
import { ComplianceTrendChart } from '@/components/compliance/ComplianceTrendChart';
import { UrgentDeadlinesTable } from '@/components/compliance/UrgentDeadlinesTable';
import { RecentBreachesCard } from '@/components/compliance/RecentBreachesCard';
import { ComplianceQuickActions } from '@/components/compliance/ComplianceQuickActions';
import { ComplianceCalendarMini } from '@/components/compliance/ComplianceCalendarMini';
import { ComplianceStatsBar } from '@/components/compliance/ComplianceStatsBar';
import { NotificationSettingsModal } from '@/components/compliance/NotificationSettingsModal';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useRBAC } from '@/hooks/useAdvancedRBAC';

type DateRange = '7d' | '30d' | '90d' | 'all';

export const ComplianceDashboard: React.FC = () => {
  const { state } = useAppState();
  const { hasPermission, isRbacReady, enforcementEnabled } = useRBAC();
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // RBAC access check for compliance module
  const canViewCompliance = hasPermission('compliance', 'read');
  
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

  const { processNotifications, isProcessing, stats } = useDeadlineNotifications();
  const [isSendingReminders, setIsSendingReminders] = useState(false);

  const lastUpdated = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleSendReminders = async () => {
    setIsSendingReminders(true);
    try {
      await processNotifications();
      toast.success('Deadline reminders sent successfully', {
        description: `Processed ${stats.total} deadlines`,
      });
    } catch (error) {
      toast.error('Failed to send reminders', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsSendingReminders(false);
    }
  };

  const handleExportReport = () => {
    toast.info('Export feature coming soon', {
      description: 'PDF and Excel export will be available in the next update',
    });
  };

  // RBAC enforcement - show loading state while checking permissions
  if (!isRbacReady && enforcementEnabled) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  // RBAC enforcement - show Access Denied if no permission
  if (enforcementEnabled && isRbacReady && !canViewCompliance) {
    return (
      <div className="flex items-center justify-center h-64 flex-col space-y-4">
        <Shield className="h-12 w-12 text-muted-foreground" />
        <div className="text-lg font-medium">Access Denied</div>
        <div className="text-sm text-muted-foreground text-center max-w-md">
          You do not have permission to access the Compliance Dashboard.
          <br />
          Please contact your administrator if you need access.
        </div>
      </div>
    );
  }

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
      borderColor: 'border-l-4 border-l-blue-500',
    },
    {
      title: 'Overdue',
      value: summary?.overdue || 0,
      icon: AlertTriangle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      borderColor: 'border-l-4 border-l-destructive',
      urgent: (summary?.overdue || 0) > 0,
    },
    {
      title: 'Due This Week',
      value: (summary?.dueToday || 0) + (summary?.dueThisWeek || 0),
      icon: CalendarClock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 dark:bg-amber-950/30',
      borderColor: 'border-l-4 border-l-amber-500',
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
        ? 'border-l-4 border-l-green-500'
        : 'border-l-4 border-l-amber-500',
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
        <div className="flex items-center gap-3 flex-wrap">
          {/* Date Range Selector */}
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Updated: {lastUpdated}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportReport}
            className="gap-2"
          >
            <FileDown className="h-4 w-4" />
            Export
          </Button>
          
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

      {/* Stats Bar */}
      <ComplianceStatsBar summary={summary} totalCases={state.cases.length} />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => (
          <Card 
            key={kpi.title}
            className={cn(
              'transition-all hover:shadow-md overflow-hidden',
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

      {/* Quick Actions + Calendar + Recent Breaches Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ComplianceQuickActions 
          onSendReminders={handleSendReminders}
          onExportReport={handleExportReport}
          onOpenSettings={() => setSettingsOpen(true)}
          isSendingReminders={isSendingReminders || isProcessing}
        />
        <ComplianceCalendarMini deadlines={urgentDeadlines} />
        <RecentBreachesCard data={recentBreaches} />
      </div>

      {/* Urgent Deadlines Table */}
      <UrgentDeadlinesTable data={urgentDeadlines} />

      {/* Notification Settings Modal */}
      <NotificationSettingsModal 
        open={settingsOpen} 
        onOpenChange={setSettingsOpen} 
      />
    </div>
  );
};

export default ComplianceDashboard;

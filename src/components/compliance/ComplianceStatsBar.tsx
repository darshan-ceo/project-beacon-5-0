import React from 'react';
import { Activity, Clock, CheckCircle, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ComplianceSummary } from '@/services/complianceDashboardService';

interface ComplianceStatsBarProps {
  summary: ComplianceSummary | undefined;
  totalCases?: number;
}

export const ComplianceStatsBar: React.FC<ComplianceStatsBarProps> = ({
  summary,
  totalCases = 0,
}) => {
  const stats = [
    {
      icon: Activity,
      label: 'Cases Monitored',
      value: totalCases,
      color: 'text-blue-600',
    },
    {
      icon: Clock,
      label: 'Due Today',
      value: summary?.dueToday || 0,
      color: 'text-amber-600',
    },
    {
      icon: CheckCircle,
      label: 'This Week',
      value: summary?.dueThisWeek || 0,
      color: 'text-green-600',
    },
    {
      icon: TrendingUp,
      label: 'Next 30 Days',
      value: summary?.dueNext30Days || 0,
      color: 'text-purple-600',
    },
  ];

  return (
    <div className="flex items-center gap-6 px-4 py-2 bg-muted/30 rounded-lg border">
      {stats.map((stat, index) => (
        <React.Fragment key={stat.label}>
          <div className="flex items-center gap-2">
            <stat.icon className={cn('h-4 w-4', stat.color)} />
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">{stat.label}:</span>
              <span className={cn('text-sm font-semibold', stat.color)}>
                {stat.value}
              </span>
            </div>
          </div>
          {index < stats.length - 1 && (
            <div className="h-4 w-px bg-border" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

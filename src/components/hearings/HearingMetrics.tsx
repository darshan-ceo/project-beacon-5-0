import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { Hearing } from '@/contexts/AppStateContext';
import { isAfter, startOfYear, endOfYear, addDays, startOfDay } from 'date-fns';

interface HearingMetricsProps {
  hearings: Hearing[];
}

export const HearingMetrics: React.FC<HearingMetricsProps> = ({ hearings }) => {
  const metrics = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    const next30Days = addDays(today, 30);
    const yearStart = startOfYear(today);
    const yearEnd = endOfYear(today);

    return {
      total: hearings.length,
      upcoming: hearings.filter(h => {
        const hearingDate = new Date(h.date);
        return h.status === 'scheduled' && 
               hearingDate >= today &&
               hearingDate <= next30Days;
      }).length,
      pendingOutcome: hearings.filter(h => 
        h.status === 'concluded' && !h.outcome
      ).length,
      completedThisYear: hearings.filter(h => {
        const hearingDate = new Date(h.date);
        return ['Order Passed', 'Closed'].includes(h.outcome || '') &&
               hearingDate >= yearStart &&
               hearingDate <= yearEnd;
      }).length,
      adjourned: hearings.filter(h => 
        h.outcome === 'Adjournment'
      ).length,
    };
  }, [hearings]);

  const metricCards = [
    {
      label: 'Total Hearings',
      value: metrics.total,
      subtitle: 'All time',
      icon: Calendar,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Upcoming',
      value: metrics.upcoming,
      subtitle: 'Next 30 days',
      icon: Clock,
      color: 'text-green-600 dark:text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-950',
    },
    {
      label: 'Pending Outcome',
      value: metrics.pendingOutcome,
      subtitle: 'Needs attention',
      icon: AlertTriangle,
      color: 'text-amber-600 dark:text-amber-500',
      bgColor: 'bg-amber-50 dark:bg-amber-950',
      alert: metrics.pendingOutcome > 0,
    },
    {
      label: 'Completed',
      value: metrics.completedThisYear,
      subtitle: 'This year',
      icon: CheckCircle,
      color: 'text-green-600 dark:text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-950',
    },
    {
      label: 'Adjourned',
      value: metrics.adjourned,
      subtitle: 'Require rescheduling',
      icon: RefreshCw,
      color: 'text-orange-600 dark:text-orange-500',
      bgColor: 'bg-orange-50 dark:bg-orange-950',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {metricCards.map((metric) => {
        const Icon = metric.icon;
        return (
          <Card key={metric.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">
                    {metric.label}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-bold">{metric.value}</h3>
                  </div>
                  <p className={`text-xs mt-1 ${
                    metric.alert 
                      ? 'text-amber-600 dark:text-amber-500 font-medium' 
                      : 'text-muted-foreground'
                  }`}>
                    {metric.subtitle}
                  </p>
                </div>
                <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                  <Icon className={`h-5 w-5 ${metric.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

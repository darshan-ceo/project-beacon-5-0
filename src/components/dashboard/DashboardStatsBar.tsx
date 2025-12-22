/**
 * DashboardStatsBar - Compact horizontal stats bar
 * Similar to ComplianceStatsBar for consistent UI
 */

import React from 'react';
import { Briefcase, Users, CheckSquare, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppState } from '@/contexts/AppStateContext';
import { useMemo } from 'react';
import { isPast, parseISO, isAfter, addDays } from 'date-fns';

export const DashboardStatsBar: React.FC = () => {
  const { state } = useAppState();

  const stats = useMemo(() => {
    const activeCases = state.cases.filter(c => c.status === 'Active').length;
    const activeClients = state.clients.filter(c => c.status === 'Active').length;
    const pendingTasks = state.tasks.filter(
      t => t.status === 'Not Started' || t.status === 'In Progress'
    ).length;
    
    const now = new Date();
    const weekFromNow = addDays(now, 7);
    const upcomingHearings = state.hearings.filter(h => {
      try {
        const hearingDate = parseISO(h.date);
        return isAfter(hearingDate, now) && hearingDate <= weekFromNow;
      } catch {
        return false;
      }
    }).length;

    return [
      {
        icon: Briefcase,
        label: 'Active Cases',
        value: activeCases,
        color: 'text-blue-600',
      },
      {
        icon: Users,
        label: 'Active Clients',
        value: activeClients,
        color: 'text-purple-600',
      },
      {
        icon: CheckSquare,
        label: 'Pending Tasks',
        value: pendingTasks,
        color: 'text-orange-600',
      },
      {
        icon: Calendar,
        label: 'Upcoming Hearings',
        value: upcomingHearings,
        color: 'text-amber-600',
      },
    ];
  }, [state.cases, state.clients, state.tasks, state.hearings]);

  return (
    <div className="flex flex-wrap items-center gap-4 md:gap-6 px-4 py-3 bg-muted/30 rounded-lg border">
      {stats.map((stat, index) => (
        <React.Fragment key={stat.label}>
          <div className="flex items-center gap-2">
            <stat.icon className={cn('h-4 w-4', stat.color)} />
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {stat.label}:
              </span>
              <span className={cn('text-sm font-semibold', stat.color)}>
                {stat.value}
              </span>
            </div>
          </div>
          {index < stats.length - 1 && (
            <div className="hidden md:block h-4 w-px bg-border" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

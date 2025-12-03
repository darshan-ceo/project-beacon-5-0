/**
 * Dashboard Widget Wrapper
 * Applies corporate branding and wraps Supabase-backed widgets
 */

import React from 'react';
import { DashboardTile } from '@/utils/rbacHelper';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ActiveClientsWidget } from './ActiveClientsWidget';
import { OpenCasesWidget } from './OpenCasesWidget';
import { PendingTasksWidget } from './PendingTasksWidget';
import { UpcomingHearingsWidget } from './UpcomingHearingsWidget';
import { FollowUpsDueWidget } from './FollowUpsDueWidget';
import { RecentDocumentsWidget } from './RecentDocumentsWidget';
import { TaskCompletionWidget } from './TaskCompletionWidget';
import { TimelineStatusWidget } from './TimelineStatusWidget';
import { TimelineBreachesWidget } from './TimelineBreachesWidget';
import { CasesByStageWidget } from './CasesByStageWidget';
import { CaseAgingSummaryWidget } from './CaseAgingSummaryWidget';
import { ClientByCategoryWidget } from './ClientByCategoryWidget';
import { TeamPerformanceWidget } from './TeamPerformanceWidget';
import { TimelineComplianceWidget } from './TimelineComplianceWidget';
import { HearingOutcomeTrendWidget } from './HearingOutcomeTrendWidget';
import { CaseLoadByAdvocateWidget } from './CaseLoadByAdvocateWidget';
import { RecentFollowupsWidget } from './RecentFollowupsWidget';
import { TimeLoggedThisWeekWidget } from './TimeLoggedThisWeekWidget';
import { FollowupsAddedTodayWidget } from './FollowupsAddedTodayWidget';
import { SystemHealthWidget } from './SystemHealthWidget';
import { StatutoryDeadlinesWidget } from './StatutoryDeadlinesWidget';
import { DeadlineBreachesWidget } from './DeadlineBreachesWidget';
import { DeadlineCalendarWidget } from './DeadlineCalendarWidget';

interface DashboardWidgetProps {
  tile: DashboardTile;
}

// Map tile IDs to their Supabase-backed widget components
const WIDGET_COMPONENT_MAP: Record<string, React.ComponentType<any>> = {
  'activeClients': ActiveClientsWidget,
  'openCases': OpenCasesWidget,
  'pendingTasks': PendingTasksWidget,
  'upcomingHearings': UpcomingHearingsWidget,
  'pendingFollowups': FollowUpsDueWidget,
  'recentDocuments': RecentDocumentsWidget,
  'documentsUploadedToday': RecentDocumentsWidget,
  'taskCompletionRate': TaskCompletionWidget,
  'timelineStatus': TimelineStatusWidget,
  'timelineBreaches': TimelineBreachesWidget,
  'casesByStage': CasesByStageWidget,
  'caseAgingSummary': CaseAgingSummaryWidget,
  'clientByCategory': ClientByCategoryWidget,
  'teamPerformance': TeamPerformanceWidget,
  'timelineCompliance': TimelineComplianceWidget,
  'hearingOutcomeTrend': HearingOutcomeTrendWidget,
  'caseLoadByAdvocate': CaseLoadByAdvocateWidget,
  'recentFollowups': RecentFollowupsWidget,
  'timeLoggedThisWeek': TimeLoggedThisWeekWidget,
  'followupsAddedToday': FollowupsAddedTodayWidget,
  'systemHealth': SystemHealthWidget,
  'statutoryDeadlines': StatutoryDeadlinesWidget,
  'deadlineBreaches': DeadlineBreachesWidget,
  'deadlineCalendar': DeadlineCalendarWidget,
};

export const DashboardWidget: React.FC<DashboardWidgetProps> = ({ tile }) => {
  const WidgetComponent = WIDGET_COMPONENT_MAP[tile.id];

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tile.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (!WidgetComponent) {
    console.warn(`No widget component found for tile ID: ${tile.id}`);
    return null;
  }

  // All tiles now use medium height (240px)
  const heightClass = 'min-h-[240px]';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("relative group", heightClass)}
    >
      {/* Drag Handle - Always visible, larger hit area */}
      <Button
        {...attributes}
        {...listeners}
        variant="ghost"
        size="icon"
        className="absolute top-2 left-2 z-10 opacity-70 hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing bg-background/90 hover:bg-background shadow-md h-8 w-8"
        title="Drag to reorder"
      >
        <GripVertical className="h-5 w-5" />
      </Button>

      {/* Render the widget */}
      <div className="h-full">
        <WidgetComponent />
      </div>
    </div>
  );
};

/**
 * DashboardWidget - Widget wrapper with consistent styling
 * Applies border-l-4 accent and removes gradient backgrounds
 */

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DashboardTile } from '@/utils/rbacHelper';

// Widget Components
import { ActiveClientsWidget } from './ActiveClientsWidget';
import { OpenCasesWidget } from './OpenCasesWidget';
import { TimelineStatusWidget } from './TimelineStatusWidget';
import { UpcomingHearingsWidget } from './UpcomingHearingsWidget';
import { TimelineBreachesWidget } from './TimelineBreachesWidget';
import { CasesByStageWidget } from './CasesByStageWidget';
import { CaseAgingSummaryWidget } from './CaseAgingSummaryWidget';
import { CaseLoadByAdvocateWidget } from './CaseLoadByAdvocateWidget';
import { HearingOutcomeTrendWidget } from './HearingOutcomeTrendWidget';
import { TaskCompletionWidget } from './TaskCompletionWidget';
import { PendingTasksWidget } from './PendingTasksWidget';
import { ClientByCategoryWidget } from './ClientByCategoryWidget';
import { RecentDocumentsWidget } from './RecentDocumentsWidget';
import { TimelineComplianceWidget } from './TimelineComplianceWidget';
import { TeamPerformanceWidget } from './TeamPerformanceWidget';
import { SystemHealthWidget } from './SystemHealthWidget';
import { RecentFollowupsWidget } from './RecentFollowupsWidget';
import { TimeLoggedThisWeekWidget } from './TimeLoggedThisWeekWidget';
import { FollowupsAddedTodayWidget } from './FollowupsAddedTodayWidget';
import { FollowUpsDueWidget } from './FollowUpsDueWidget';
import { StatutoryDeadlinesWidget } from './StatutoryDeadlinesWidget';
import { DeadlineBreachesWidget } from './DeadlineBreachesWidget';
import { DeadlineCalendarWidget } from './DeadlineCalendarWidget';

interface DashboardWidgetProps {
  tile: DashboardTile;
}

// Map tile IDs to widget components
const WIDGET_COMPONENT_MAP: Record<string, React.ComponentType> = {
  activeClients: ActiveClientsWidget,
  openCases: OpenCasesWidget,
  timelineStatus: TimelineStatusWidget,
  upcomingHearings: UpcomingHearingsWidget,
  timelineBreaches: TimelineBreachesWidget,
  casesByStage: CasesByStageWidget,
  caseAgingSummary: CaseAgingSummaryWidget,
  caseLoadByAdvocate: CaseLoadByAdvocateWidget,
  hearingOutcomeTrend: HearingOutcomeTrendWidget,
  taskCompletionRate: TaskCompletionWidget,
  pendingTasks: PendingTasksWidget,
  clientByCategory: ClientByCategoryWidget,
  documentsUploadedToday: RecentDocumentsWidget,
  recentDocuments: RecentDocumentsWidget,
  timelineCompliance: TimelineComplianceWidget,
  teamPerformance: TeamPerformanceWidget,
  systemHealth: SystemHealthWidget,
  recentFollowups: RecentFollowupsWidget,
  timeLoggedThisWeek: TimeLoggedThisWeekWidget,
  followupsAddedToday: FollowupsAddedTodayWidget,
  pendingFollowups: FollowUpsDueWidget,
  statutoryDeadlines: StatutoryDeadlinesWidget,
  deadlineBreaches: DeadlineBreachesWidget,
  deadlineCalendar: DeadlineCalendarWidget,
};

// Color theme to border color mapping
const colorThemeToBorder: Record<string, string> = {
  'vibrant-green': 'border-l-green-500',
  'vibrant-blue': 'border-l-blue-500',
  'vibrant-purple': 'border-l-purple-500',
  'vibrant-orange': 'border-l-orange-500',
  'vibrant-amber': 'border-l-amber-500',
  'vibrant-red': 'border-l-destructive',
  'vibrant-gray': 'border-l-gray-500',
  'vibrant-cyan': 'border-l-cyan-500',
  'vibrant-lavender': 'border-l-indigo-500',
  'vibrant-pink': 'border-l-pink-500',
  'vibrant-teal': 'border-l-teal-500',
  'vibrant-yellow': 'border-l-yellow-500',
  'vibrant-indigo': 'border-l-indigo-500',
};

export const DashboardWidget: React.FC<DashboardWidgetProps> = ({ tile }) => {
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
  };

  const WidgetComponent = WIDGET_COMPONENT_MAP[tile.id];
  const borderColor = colorThemeToBorder[tile.colorTheme] || 'border-l-primary';

  if (!WidgetComponent) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'relative h-full rounded-lg border border-l-4 bg-card p-4',
          borderColor,
          isDragging && 'opacity-50 z-50'
        )}
      >
        <p className="text-muted-foreground text-sm">Widget not found: {tile.id}</p>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative group h-full',
        isDragging && 'opacity-50 z-50'
      )}
    >
      {/* Drag Handle - Visible on hover */}
      <div
        {...attributes}
        {...listeners}
        className={cn(
          'absolute top-2 right-2 z-10 p-1.5 rounded-md bg-muted/80 backdrop-blur-sm',
          'opacity-0 group-hover:opacity-100 transition-opacity cursor-grab',
          'hover:bg-muted active:cursor-grabbing'
        )}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Widget Content */}
      <div className="h-full">
        <WidgetComponent />
      </div>
    </div>
  );
};

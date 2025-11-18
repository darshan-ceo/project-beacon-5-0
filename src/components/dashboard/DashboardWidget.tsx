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

  // Map heightClass to Tailwind classes
  const heightClassMap = {
    compact: 'min-h-[200px]',
    medium: 'min-h-[240px]',
    tall: 'min-h-[320px]',
  };

  const heightClass = heightClassMap[tile.heightClass as keyof typeof heightClassMap] || 'min-h-[200px]';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("relative group", heightClass)}
    >
      {/* Drag Handle - Always visible */}
      <Button
        {...attributes}
        {...listeners}
        variant="ghost"
        size="icon"
        className="absolute top-2 left-2 z-10 opacity-60 hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing bg-background/80 hover:bg-background shadow-sm"
        title="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </Button>

      {/* Render the widget */}
      <div className="h-full">
        <WidgetComponent />
      </div>
    </div>
  );
};

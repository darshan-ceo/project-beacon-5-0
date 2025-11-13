/**
 * Dashboard Widget Wrapper
 * Applies corporate branding and wraps Supabase-backed widgets
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardTile } from '@/utils/rbacHelper';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
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

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 z-10 p-1.5 rounded-md
          bg-background/80 hover:bg-background
          border border-border/50 hover:border-border
          opacity-0 group-hover:opacity-100
          transition-opacity cursor-grab active:cursor-grabbing
          shadow-sm hover:shadow-md"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      
      <WidgetComponent />
    </div>
  );
};

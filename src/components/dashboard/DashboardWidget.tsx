/**
 * Dashboard Widget Wrapper
 * Applies corporate branding and wraps Supabase-backed widgets
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardTile } from '@/utils/rbacHelper';
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

  if (!WidgetComponent) {
    console.warn(`No widget component found for tile ID: ${tile.id}`);
    return null;
  }

  return <WidgetComponent />;
};

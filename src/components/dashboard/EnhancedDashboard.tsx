/**
 * Enhanced Dashboard Component
 * Modular, personalization-enabled dashboard with vibrant tiles
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppState } from '@/contexts/AppStateContext';
import { useRBAC } from '@/hooks/useAdvancedRBAC';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { PageHelp } from '@/components/help/PageHelp';
import { InlineHelp } from '@/components/help/InlineHelp';
import { FollowUpsDueWidget } from './FollowUpsDueWidget';
import { ActiveClientsWidget } from './ActiveClientsWidget';
import { OpenCasesWidget } from './OpenCasesWidget';
import { PendingTasksWidget } from './PendingTasksWidget';
import { UpcomingHearingsWidget } from './UpcomingHearingsWidget';
import { RecentDocumentsWidget } from './RecentDocumentsWidget';
import { TaskCompletionWidget } from './TaskCompletionWidget';

export const EnhancedDashboard: React.FC = () => {
  const { state } = useAppState();
  const { hasPermission } = useRBAC();

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">Practice Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive insights and metrics for your workspace
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PageHelp pageId="dashboard" variant="floating" />
          <InlineHelp module="dashboard" />
        </div>
      </motion.div>

      {/* Follow-Ups Due Widget (always visible) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <FollowUpsDueWidget />
      </motion.div>

      {/* Live Supabase-Backed Widgets */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <ActiveClientsWidget />
        <OpenCasesWidget />
        <PendingTasksWidget />
        <UpcomingHearingsWidget />
        <RecentDocumentsWidget />
        <TaskCompletionWidget />
      </motion.div>
    </div>
  );
};

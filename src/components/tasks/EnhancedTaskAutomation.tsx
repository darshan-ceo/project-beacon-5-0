/**
 * Enhanced Task Automation with Initialization Guard and Write-Through Services
 */

import React from 'react';
import { InitializationGuard } from '@/components/common/InitializationGuard';
import { TaskAutomation } from './TaskAutomation';

export function EnhancedTaskAutomation() {
  return (
    <InitializationGuard>
      <TaskAutomation />
    </InitializationGuard>
  );
}
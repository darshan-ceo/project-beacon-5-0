/**
 * Hook for managing deadline notifications in components
 */

import { useState, useEffect, useCallback } from 'react';
import { deadlineNotificationService, PendingDeadline, DeadlineNotificationConfig } from '@/services/deadlineNotificationService';
import { useAuth } from '@/contexts/AuthContext';

interface DeadlineStats {
  total: number;
  breached: number;
  today: number;
  tomorrow: number;
  thisWeek: number;
  upcoming: number;
}

export function useDeadlineNotifications() {
  const { user, tenantId } = useAuth();
  const [pendingDeadlines, setPendingDeadlines] = useState<PendingDeadline[]>([]);
  const [stats, setStats] = useState<DeadlineStats>({
    total: 0,
    breached: 0,
    today: 0,
    tomorrow: 0,
    thisWeek: 0,
    upcoming: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Load pending deadlines
   */
  const loadDeadlines = useCallback(async () => {
    if (!tenantId) return;
    
    setIsLoading(true);
    try {
      const deadlines = await deadlineNotificationService.getPendingDeadlines(tenantId);
      setPendingDeadlines(deadlines);

      const deadlineStats = await deadlineNotificationService.getDeadlineStats(tenantId);
      setStats(deadlineStats);
    } catch (error) {
      console.error('Error loading deadlines:', error);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  /**
   * Process notifications manually
   */
  const processNotifications = useCallback(async () => {
    if (!tenantId || !user?.id) return;
    
    setIsProcessing(true);
    try {
      await deadlineNotificationService.processDeadlineNotifications(tenantId, user.id);
      await loadDeadlines(); // Refresh after processing
    } catch (error) {
      console.error('Error processing notifications:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [tenantId, user?.id, loadDeadlines]);

  /**
   * Update notification configuration
   */
  const updateConfig = useCallback((config: Partial<DeadlineNotificationConfig>) => {
    deadlineNotificationService.setConfig(config);
  }, []);

  /**
   * Send notification for specific deadline
   */
  const sendNotification = useCallback(async (deadline: PendingDeadline) => {
    if (!user?.id) return false;
    return deadlineNotificationService.sendDeadlineNotification(deadline, user.id);
  }, [user?.id]);

  // Load deadlines on mount and when tenantId changes
  useEffect(() => {
    loadDeadlines();
  }, [loadDeadlines]);

  // Start auto-check when component mounts
  useEffect(() => {
    if (tenantId && user?.id) {
      // Check every 4 hours
      deadlineNotificationService.startAutoCheck(tenantId, user.id, 4 * 60 * 60 * 1000);
    }

    return () => {
      deadlineNotificationService.stopAutoCheck();
    };
  }, [tenantId, user?.id]);

  return {
    pendingDeadlines,
    stats,
    isLoading,
    isProcessing,
    loadDeadlines,
    processNotifications,
    updateConfig,
    sendNotification,
    
    // Convenience getters
    urgentDeadlines: pendingDeadlines.filter(d => d.status === 'breached' || d.status === 'today'),
    upcomingDeadlines: pendingDeadlines.filter(d => d.status === 'upcoming' || d.status === 'tomorrow'),
    breachedCount: stats.breached,
    todayCount: stats.today,
  };
}

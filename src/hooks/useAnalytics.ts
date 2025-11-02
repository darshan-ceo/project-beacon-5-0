/**
 * Analytics Hook - Phase 3A
 * React Query integration for analytics data
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { analyticsService, CaseMetrics, HearingMetrics, TaskMetrics, KPIDashboard, HistoricalTrend, EmployeeProductivity } from '@/services/analyticsService';
import { useAuth } from '@/contexts/AuthContext';
import { subDays } from 'date-fns';

export interface UseAnalyticsOptions {
  dateRange?: { start: Date; end: Date };
  employeeId?: string;
  clientId?: string;
  stage?: string;
  enabled?: boolean;
}

export const useAnalytics = (options: UseAnalyticsOptions = {}) => {
  const { tenantId } = useAuth();
  const enabled = options.enabled !== false && !!tenantId;

  // Case Metrics Query
  const caseMetrics: UseQueryResult<CaseMetrics, Error> = useQuery({
    queryKey: ['analytics', 'cases', tenantId, options.dateRange, options.stage],
    queryFn: () => analyticsService.getCaseMetrics({ 
      tenantId: tenantId!, 
      dateRange: options.dateRange,
      stage: options.stage 
    }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
    enabled: enabled,
  });

  // Hearing Metrics Query
  const hearingMetrics: UseQueryResult<HearingMetrics, Error> = useQuery({
    queryKey: ['analytics', 'hearings', tenantId, options.dateRange],
    queryFn: () => analyticsService.getHearingMetrics({ 
      tenantId: tenantId!, 
      dateRange: options.dateRange 
    }),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    enabled: enabled,
  });

  // Task Metrics Query
  const taskMetrics: UseQueryResult<TaskMetrics, Error> = useQuery({
    queryKey: ['analytics', 'tasks', tenantId, options.employeeId, options.dateRange],
    queryFn: () => analyticsService.getTaskMetrics({ 
      tenantId: tenantId!, 
      employeeId: options.employeeId,
      dateRange: options.dateRange 
    }),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    enabled: enabled,
  });

  // Employee Productivity Query
  const employeeProductivity: UseQueryResult<EmployeeProductivity[], Error> = useQuery({
    queryKey: ['analytics', 'employee-productivity', tenantId, options.employeeId],
    queryFn: () => analyticsService.getEmployeeProductivity(tenantId!, options.employeeId),
    staleTime: 15 * 60 * 1000, // 15 minutes
    enabled: enabled,
  });

  // KPI Dashboard Query
  const kpiDashboard: UseQueryResult<KPIDashboard, Error> = useQuery({
    queryKey: ['analytics', 'kpi-dashboard', tenantId],
    queryFn: () => analyticsService.generateKPIDashboard(tenantId!),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    enabled: enabled,
  });

  // Historical Trends (last 30 days)
  const historicalCaseTrends: UseQueryResult<HistoricalTrend[], Error> = useQuery({
    queryKey: ['analytics', 'historical-trends', 'cases', tenantId],
    queryFn: () => analyticsService.getHistoricalTrends(tenantId!, 'case_count', 30),
    staleTime: 15 * 60 * 1000,
    enabled: enabled,
  });

  const historicalTaskTrends: UseQueryResult<HistoricalTrend[], Error> = useQuery({
    queryKey: ['analytics', 'historical-trends', 'tasks', tenantId],
    queryFn: () => analyticsService.getHistoricalTrends(tenantId!, 'task_completion', 30),
    staleTime: 15 * 60 * 1000,
    enabled: enabled,
  });

  // Client Engagement Query
  const clientEngagement = useQuery({
    queryKey: ['analytics', 'client-engagement', tenantId, options.clientId],
    queryFn: () => analyticsService.getClientEngagement(tenantId!, options.clientId),
    staleTime: 15 * 60 * 1000,
    enabled: enabled,
  });

  return {
    caseMetrics,
    hearingMetrics,
    taskMetrics,
    employeeProductivity,
    kpiDashboard,
    historicalCaseTrends,
    historicalTaskTrends,
    clientEngagement,
    isLoading: caseMetrics.isLoading || hearingMetrics.isLoading || taskMetrics.isLoading,
    isError: caseMetrics.isError || hearingMetrics.isError || taskMetrics.isError,
    refetchAll: () => {
      caseMetrics.refetch();
      hearingMetrics.refetch();
      taskMetrics.refetch();
      employeeProductivity.refetch();
      kpiDashboard.refetch();
    },
  };
};

/**
 * Hook for specific date range analytics
 */
export const useDateRangeAnalytics = (startDate: Date, endDate: Date) => {
  return useAnalytics({
    dateRange: { start: startDate, end: endDate },
  });
};

/**
 * Hook for current week analytics
 */
export const useWeeklyAnalytics = () => {
  const today = new Date();
  const weekStart = subDays(today, 7);
  
  return useAnalytics({
    dateRange: { start: weekStart, end: today },
  });
};

/**
 * Hook for current month analytics
 */
export const useMonthlyAnalytics = () => {
  const today = new Date();
  const monthStart = subDays(today, 30);
  
  return useAnalytics({
    dateRange: { start: monthStart, end: today },
  });
};

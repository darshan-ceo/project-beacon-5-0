import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { complianceDashboardService } from '@/services/complianceDashboardService';

export function useComplianceDashboard() {
  const { tenantId } = useAuth();

  const summaryQuery = useQuery({
    queryKey: ['compliance-summary', tenantId],
    queryFn: () => complianceDashboardService.getComplianceSummary(tenantId!),
    enabled: !!tenantId,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });

  const deadlinesByStatusQuery = useQuery({
    queryKey: ['compliance-deadlines-status', tenantId],
    queryFn: () => complianceDashboardService.getDeadlinesByStatus(tenantId!),
    enabled: !!tenantId,
    staleTime: 60 * 1000,
  });

  const deadlinesByAuthorityQuery = useQuery({
    queryKey: ['compliance-deadlines-authority', tenantId],
    queryFn: () => complianceDashboardService.getDeadlinesByAuthority(tenantId!),
    enabled: !!tenantId,
    staleTime: 60 * 1000,
  });

  const trendQuery = useQuery({
    queryKey: ['compliance-trend', tenantId],
    queryFn: () => complianceDashboardService.getComplianceTrend(tenantId!, 30),
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  const urgentDeadlinesQuery = useQuery({
    queryKey: ['compliance-urgent-deadlines', tenantId],
    queryFn: () => complianceDashboardService.getUrgentDeadlines(tenantId!, 20),
    enabled: !!tenantId,
    staleTime: 60 * 1000,
  });

  const recentBreachesQuery = useQuery({
    queryKey: ['compliance-recent-breaches', tenantId],
    queryFn: () => complianceDashboardService.getRecentBreaches(tenantId!, 10),
    enabled: !!tenantId,
    staleTime: 60 * 1000,
  });

  const refetchAll = () => {
    summaryQuery.refetch();
    deadlinesByStatusQuery.refetch();
    deadlinesByAuthorityQuery.refetch();
    trendQuery.refetch();
    urgentDeadlinesQuery.refetch();
    recentBreachesQuery.refetch();
  };

  return {
    summary: summaryQuery.data,
    deadlinesByStatus: deadlinesByStatusQuery.data || [],
    deadlinesByAuthority: deadlinesByAuthorityQuery.data || [],
    trend: trendQuery.data || [],
    urgentDeadlines: urgentDeadlinesQuery.data || [],
    recentBreaches: recentBreachesQuery.data || [],
    isLoading: summaryQuery.isLoading || deadlinesByStatusQuery.isLoading,
    isError: summaryQuery.isError || deadlinesByStatusQuery.isError,
    refetchAll,
  };
}

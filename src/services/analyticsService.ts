/**
 * Analytics Service - Phase 3A
 * Centralized service for all analytics operations
 */

import { supabase } from '@/integrations/supabase/client';
import { addDays, subDays, format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export interface AnalyticsFilter {
  tenantId: string;
  dateRange?: { start: Date; end: Date };
  employeeId?: string;
  clientId?: string;
  stage?: string;
}

export interface CaseMetrics {
  totalCases: number;
  activeCases: number;
  completedCases: number;
  criticalCases: number;
  averageAge: number;
  stageDistribution: Record<string, number>;
  timelineCompliance: {
    green: number;
    amber: number;
    red: number;
  };
}

export interface HearingMetrics {
  totalHearings: number;
  scheduled: number;
  completed: number;
  adjourned: number;
  completionRate: number;
  upcomingThisWeek: number;
}

export interface TaskMetrics {
  totalTasks: number;
  openTasks: number;
  completedTasks: number;
  overdueTasks: number;
  completionRate: number;
  avgCompletionTime: number;
}

export interface EmployeeProductivity {
  employeeId: string;
  employeeCode: string;
  assignedCases: number;
  assignedTasks: number;
  completedTasks: number;
  avgTaskCompletionDays: number;
}

export interface HistoricalTrend {
  date: string;
  value: number;
}

export interface KPIDashboard {
  caseMetrics: CaseMetrics;
  hearingMetrics: HearingMetrics;
  taskMetrics: TaskMetrics;
  complianceRate: number;
  productivity: {
    tasksCompletedThisWeek: number;
    avgResolutionTime: number;
  };
}

export const analyticsService = {
  /**
   * Get comprehensive case metrics
   */
  async getCaseMetrics(filters: AnalyticsFilter): Promise<CaseMetrics> {
    try {
      // Fetch case analytics summary from view
      const { data: summaryData, error: summaryError } = await supabase
        .from('case_analytics_summary')
        .select('*')
        .eq('tenant_id', filters.tenantId);

      if (summaryError) throw summaryError;

      // Fetch individual cases for detailed calculations
      let query = supabase
        .from('cases')
        .select('*')
        .eq('tenant_id', filters.tenantId);

      if (filters.dateRange) {
        query = query
          .gte('created_at', filters.dateRange.start.toISOString())
          .lte('created_at', filters.dateRange.end.toISOString());
      }

      if (filters.stage) {
        query = query.eq('stage_code', filters.stage);
      }

      const { data: cases, error: casesError } = await query;
      if (casesError) throw casesError;

      // Calculate metrics
      const totalCases = cases?.length || 0;
      const activeCases = cases?.filter(c => c.status === 'Active').length || 0;
      const completedCases = cases?.filter(c => c.status === 'Completed').length || 0;
      const criticalCases = cases?.filter(c => c.priority === 'Critical').length || 0;

      // Calculate average age
      const averageAge = cases && cases.length > 0
        ? Math.round(
            cases.reduce((sum, c) => {
              const age = Math.floor(
                (new Date().getTime() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24)
              );
              return sum + age;
            }, 0) / cases.length
          )
        : 0;

      // Stage distribution
      const stageDistribution: Record<string, number> = {};
      cases?.forEach(c => {
        const stage = c.stage_code || 'Unknown';
        stageDistribution[stage] = (stageDistribution[stage] || 0) + 1;
      });

      // Timeline compliance (simplified - based on age)
      const green = cases?.filter(c => {
        const age = Math.floor(
          (new Date().getTime() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        return age <= 30;
      }).length || 0;

      const amber = cases?.filter(c => {
        const age = Math.floor(
          (new Date().getTime() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        return age > 30 && age <= 60;
      }).length || 0;

      const red = cases?.filter(c => {
        const age = Math.floor(
          (new Date().getTime() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        return age > 60;
      }).length || 0;

      return {
        totalCases,
        activeCases,
        completedCases,
        criticalCases,
        averageAge,
        stageDistribution,
        timelineCompliance: { green, amber, red },
      };
    } catch (error) {
      console.error('Error fetching case metrics:', error);
      throw error;
    }
  },

  /**
   * Get hearing metrics
   */
  async getHearingMetrics(filters: AnalyticsFilter): Promise<HearingMetrics> {
    try {
      let query = supabase
        .from('hearings')
        .select('*')
        .eq('tenant_id', filters.tenantId);

      if (filters.dateRange) {
        query = query
          .gte('hearing_date', filters.dateRange.start.toISOString())
          .lte('hearing_date', filters.dateRange.end.toISOString());
      }

      const { data: hearings, error } = await query;
      if (error) throw error;

      const totalHearings = hearings?.length || 0;
      const scheduled = hearings?.filter(h => h.status === 'Scheduled').length || 0;
      const completed = hearings?.filter(h => h.status === 'Completed').length || 0;
      const adjourned = hearings?.filter(h => h.status === 'Adjourned').length || 0;
      const completionRate = totalHearings > 0 ? Math.round((completed / totalHearings) * 100) : 0;

      // Upcoming this week
      const weekStart = startOfWeek(new Date());
      const weekEnd = endOfWeek(new Date());
      const upcomingThisWeek = hearings?.filter(h => {
        const hearingDate = new Date(h.hearing_date);
        return hearingDate >= weekStart && hearingDate <= weekEnd && h.status === 'Scheduled';
      }).length || 0;

      return {
        totalHearings,
        scheduled,
        completed,
        adjourned,
        completionRate,
        upcomingThisWeek,
      };
    } catch (error) {
      console.error('Error fetching hearing metrics:', error);
      throw error;
    }
  },

  /**
   * Get task performance metrics
   */
  async getTaskMetrics(filters: AnalyticsFilter): Promise<TaskMetrics> {
    try {
      let query = supabase
        .from('tasks')
        .select('*')
        .eq('tenant_id', filters.tenantId);

      if (filters.employeeId) {
        query = query.eq('assigned_to', filters.employeeId);
      }

      if (filters.dateRange) {
        query = query
          .gte('created_at', filters.dateRange.start.toISOString())
          .lte('created_at', filters.dateRange.end.toISOString());
      }

      const { data: tasks, error } = await query;
      if (error) throw error;

      const totalTasks = tasks?.length || 0;
      const openTasks = tasks?.filter(t => t.status === 'Open' || t.status === 'In Progress').length || 0;
      const completedTasks = tasks?.filter(t => t.status === 'Completed').length || 0;
      const overdueTasks = tasks?.filter(t => {
        if (!t.due_date) return false;
        return new Date(t.due_date) < new Date() && t.status !== 'Completed';
      }).length || 0;

      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Calculate average completion time
      const completedTasksWithDates = tasks?.filter(t => t.status === 'Completed' && t.completed_date) || [];
      const avgCompletionTime = completedTasksWithDates.length > 0
        ? Math.round(
            completedTasksWithDates.reduce((sum, t) => {
              const completionTime = Math.floor(
                (new Date(t.completed_date!).getTime() - new Date(t.created_at).getTime()) / (1000 * 60 * 60 * 24)
              );
              return sum + completionTime;
            }, 0) / completedTasksWithDates.length
          )
        : 0;

      return {
        totalTasks,
        openTasks,
        completedTasks,
        overdueTasks,
        completionRate,
        avgCompletionTime,
      };
    } catch (error) {
      console.error('Error fetching task metrics:', error);
      throw error;
    }
  },

  /**
   * Get employee productivity metrics
   */
  async getEmployeeProductivity(tenantId: string, employeeId?: string): Promise<EmployeeProductivity[]> {
    try {
      let query = supabase
        .from('employee_productivity_metrics')
        .select('*')
        .eq('tenant_id', tenantId);

      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(d => ({
        employeeId: d.employee_id,
        employeeCode: d.employee_code,
        assignedCases: d.assigned_cases || 0,
        assignedTasks: d.assigned_tasks || 0,
        completedTasks: d.completed_tasks || 0,
        avgTaskCompletionDays: d.avg_task_completion_days || 0,
      }));
    } catch (error) {
      console.error('Error fetching employee productivity:', error);
      throw error;
    }
  },

  /**
   * Get historical trends for a metric
   */
  async getHistoricalTrends(
    tenantId: string,
    metricType: string,
    days: number = 30
  ): Promise<HistoricalTrend[]> {
    try {
      const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('analytics_snapshots')
        .select('snapshot_date, metric_value')
        .eq('tenant_id', tenantId)
        .eq('metric_type', metricType)
        .gte('snapshot_date', startDate)
        .order('snapshot_date', { ascending: true });

      if (error) throw error;

      return (data || []).map(d => ({
        date: d.snapshot_date,
        value: typeof d.metric_value === 'number' ? d.metric_value : 0,
      }));
    } catch (error) {
      console.error('Error fetching historical trends:', error);
      return [];
    }
  },

  /**
   * Capture a snapshot of metrics for historical tracking
   */
  async captureSnapshot(tenantId: string, metricType: string, metricValue: any): Promise<void> {
    try {
      const { error } = await supabase.from('analytics_snapshots').insert({
        tenant_id: tenantId,
        snapshot_date: format(new Date(), 'yyyy-MM-dd'),
        metric_type: metricType,
        metric_value: metricValue,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error capturing snapshot:', error);
      throw error;
    }
  },

  /**
   * Generate KPI dashboard data
   */
  async generateKPIDashboard(tenantId: string): Promise<KPIDashboard> {
    try {
      const [caseMetrics, hearingMetrics, taskMetrics] = await Promise.all([
        this.getCaseMetrics({ tenantId }),
        this.getHearingMetrics({ tenantId }),
        this.getTaskMetrics({ tenantId }),
      ]);

      // Calculate overall compliance rate
      const { green, amber, red } = caseMetrics.timelineCompliance;
      const total = green + amber + red;
      const complianceRate = total > 0 ? Math.round((green / total) * 100) : 0;

      // Tasks completed this week
      const weekStart = startOfWeek(new Date());
      const { data: weeklyTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', 'Completed')
        .gte('completed_date', weekStart.toISOString());

      const tasksCompletedThisWeek = weeklyTasks?.length || 0;

      return {
        caseMetrics,
        hearingMetrics,
        taskMetrics,
        complianceRate,
        productivity: {
          tasksCompletedThisWeek,
          avgResolutionTime: taskMetrics.avgCompletionTime,
        },
      };
    } catch (error) {
      console.error('Error generating KPI dashboard:', error);
      throw error;
    }
  },

  /**
   * Get client engagement metrics
   */
  async getClientEngagement(tenantId: string, clientId?: string) {
    try {
      let caseQuery = supabase
        .from('cases')
        .select('client_id')
        .eq('tenant_id', tenantId);

      if (clientId) {
        caseQuery = caseQuery.eq('client_id', clientId);
      }

      const { data: cases, error } = await caseQuery;
      if (error) throw error;

      // Group by client
      const clientCounts: Record<string, number> = {};
      cases?.forEach(c => {
        if (c.client_id) {
          clientCounts[c.client_id] = (clientCounts[c.client_id] || 0) + 1;
        }
      });

      return clientCounts;
    } catch (error) {
      console.error('Error fetching client engagement:', error);
      return {};
    }
  },
};

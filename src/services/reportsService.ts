import { toast } from '@/hooks/use-toast';
import { AppAction } from '@/contexts/AppStateContext';
import { formTemplatesService, type FormTemplate } from './formTemplatesService';
import { Case, Client } from '@/contexts/AppStateContext';
import { normalizeStage } from '@/utils/stageUtils';
import { calculateSLAStatus } from '@/services/slaService';

// DEPRECATED: Export functions moved to @/utils/reportExporter
// Use the new reportExporter utility for proper Excel and PDF exports
export const reportsService = {
  // @deprecated Use exportRows from @/utils/exporter instead
  exportCaseList: async (
    cases: any[],
    format: 'excel' | 'pdf' = 'excel',
    filters?: {
      clientId?: string;
      stage?: string;
      dateRange?: { start: string; end: string };
    }
  ): Promise<string> => {
    try {
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Filter cases based on criteria
      let filteredCases = cases;
      if (filters?.clientId) {
        filteredCases = filteredCases.filter(c => c.clientId === filters.clientId);
      }
      if (filters?.stage) {
        const normalizedFilterStage = normalizeStage(filters.stage);
        filteredCases = filteredCases.filter(c => normalizeStage(c.currentStage) === normalizedFilterStage);
      }

      // Mock file generation
      const fileName = `case-list-${new Date().toISOString().split('T')[0]}.${format}`;
      const mockFileUrl = `data:text/plain;charset=utf-8,${encodeURIComponent(
        `Case List Export (${format.toUpperCase()})\n` +
        `Generated: ${new Date().toLocaleString()}\n` +
        `Total Cases: ${filteredCases.length}\n\n` +
        filteredCases.map(c => 
          `${c.caseNumber} | ${c.title} | ${c.currentStage} | ${c.slaStatus}`
        ).join('\n')
      )}`;

      // Trigger download
      const link = document.createElement('a');
      link.href = mockFileUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export Successful",
        description: `Case list exported as ${fileName}`,
      });

      return fileName;
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export case list",
        variant: "destructive"
      });
      throw error;
    }
  },

  // Export timeline to CSV/PDF
  exportTimeline: async (
    caseId: string,
    format: 'csv' | 'pdf' = 'csv'
  ): Promise<string> => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const fileName = `timeline-${caseId}-${new Date().toISOString().split('T')[0]}.${format}`;
      const mockFileUrl = `data:text/plain;charset=utf-8,${encodeURIComponent(
        `Case Timeline Export (${format.toUpperCase()})\n` +
        `Case ID: ${caseId}\n` +
        `Generated: ${new Date().toLocaleString()}\n\n` +
        `Date | Event | Stage | Status\n` +
        `2024-01-15 | Case Filed | Scrutiny | Green\n` +
        `2024-02-01 | Document Review | Scrutiny | Green\n` +
        `2024-02-15 | Hearing Scheduled | Adjudication | Amber\n`
      )}`;

      const link = document.createElement('a');
      link.href = mockFileUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Timeline Exported",
        description: `Timeline exported as ${fileName}`,
      });

      return fileName;
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export timeline",
        variant: "destructive"
      });
      throw error;
    }
  },

  // Export hearing cause list
  exportHearingCauseList: async (
    hearings: any[],
    format: 'excel' | 'pdf' = 'excel',
    dateRange?: { start: string; end: string }
  ): Promise<string> => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1200));

      let filteredHearings = hearings;
      if (dateRange) {
        filteredHearings = hearings.filter(h => 
          h.date >= dateRange.start && h.date <= dateRange.end
        );
      }

      const fileName = `hearing-cause-list-${new Date().toISOString().split('T')[0]}.${format}`;
      const mockFileUrl = `data:text/plain;charset=utf-8,${encodeURIComponent(
        `Hearing Cause List (${format.toUpperCase()})\n` +
        `Generated: ${new Date().toLocaleString()}\n` +
        `Total Hearings: ${filteredHearings.length}\n\n` +
        `Date | Case Number | Court | Judge | Type\n` +
        filteredHearings.map(h => 
          `${h.date} | ${h.caseNumber || 'N/A'} | ${h.courtName || 'N/A'} | ${h.judgeName || 'N/A'} | ${h.type || 'N/A'}`
        ).join('\n')
      )}`;

      const link = document.createElement('a');
      link.href = mockFileUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Cause List Exported",
        description: `Hearing cause list exported as ${fileName}`,
      });

      return fileName;
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export hearing cause list",
        variant: "destructive"
      });
      throw error;
    }
  },

  // Export dashboard data
  exportDashboardData: async (
    dashboardData: {
      stats: any[];
      charts: any[];
      period: string;
    },
    format: 'excel' | 'pdf' = 'excel'
  ): Promise<string> => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const fileName = `dashboard-report-${new Date().toISOString().split('T')[0]}.${format}`;
      const mockFileUrl = `data:text/plain;charset=utf-8,${encodeURIComponent(
        `Dashboard Report (${format.toUpperCase()})\n` +
        `Period: ${dashboardData.period}\n` +
        `Generated: ${new Date().toLocaleString()}\n\n` +
        `Key Metrics:\n` +
        dashboardData.stats.map(s => `${s.title}: ${s.value} (${s.description})`).join('\n') +
        `\n\nChart Data:\n` +
        dashboardData.charts.map(c => `${c.title}: ${c.data?.length || 0} data points`).join('\n')
      )}`;

      const link = document.createElement('a');
      link.href = mockFileUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Dashboard Exported",
        description: `Dashboard data exported as ${fileName}`,
      });

      return fileName;
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export dashboard data",
        variant: "destructive"
      });
      throw error;
    }
  },

  // Get case reports with filters
  getCaseReport: async (filters: any): Promise<{ data: any[] }> => {
    try {
      const { storageManager } = await import('@/data/StorageManager');
      const storage = storageManager.getStorage();

      const cases = await storage.getAll('cases');
      const clients = await storage.getAll('clients');
      const employees = await storage.getAll('employees');

      const clientMap = new Map(clients.map((c: any) => [c.id, c.display_name || c.name || 'Unknown']));
      const employeeMap = new Map(employees.map((e: any) => [e.id, e.full_name || e.name || 'Unknown']));

      // Transform cases to add calculated timelineBreachStatus
      const casesWithSLA = cases.map((c: any) => {
        // Build case object with required fields for SLA calculation
        const caseObj = {
          ...c,
          lastUpdated: c.updated_at || c.lastUpdated || c.created_at,
          status: c.status || 'Active',
          nextHearing: c.next_hearing_date ? { date: c.next_hearing_date } : undefined,
        };
        
        // Calculate SLA status using the same logic as DataInitializer
        const timelineBreachStatus = calculateSLAStatus(caseObj as any);
        
        return {
          ...c,
          timelineBreachStatus,
        };
      });

      let filteredCases = casesWithSLA;

      if (filters.clientId) {
        filteredCases = filteredCases.filter((c: any) => (c.client_id || c.clientId) === filters.clientId);
      }

      if (filters.stage) {
        const normalizedFilterStage = normalizeStage(filters.stage);
        filteredCases = filteredCases.filter((c: any) => normalizeStage(c.stage_code || c.currentStage) === normalizedFilterStage);
      }

      if (filters.ragStatus) {
        filteredCases = filteredCases.filter((c: any) => (c.timeline_breach_status || c.timelineBreachStatus) === filters.ragStatus);
      }

      if (filters.priority) {
        filteredCases = filteredCases.filter((c: any) => c.priority === filters.priority);
      }

      if (filters.ownerId) {
        filteredCases = filteredCases.filter((c: any) => (c.assigned_to || c.assignedToId) === filters.ownerId);
      }

      if (filters.status) {
        filteredCases = filteredCases.filter((c: any) => c.status === filters.status);
      }

      if (filters.dateRange) {
        const { start, end } = filters.dateRange;
        filteredCases = filteredCases.filter((c: any) => {
          const createdDate = new Date(c.created_at || c.createdDate);
          return createdDate >= new Date(start) && createdDate <= new Date(end);
        });
      }

      const reportData = filteredCases.map((caseItem: any) => {
        const agingDays = Math.floor(
          (new Date().getTime() - new Date(caseItem.created_at || caseItem.createdDate).getTime()) / (1000 * 60 * 60 * 24)
        );

        return {
          id: caseItem.id,
          caseNumber: caseItem.case_number || caseItem.caseNumber || 'N/A',
          caseType: caseItem.case_type || caseItem.caseType || 'GST',
          title: caseItem.title,
          client: clientMap.get(caseItem.client_id || caseItem.clientId) || 'Unknown',
          stage: caseItem.stage_code || caseItem.currentStage || 'Unknown',
          owner: employeeMap.get(caseItem.assigned_to || caseItem.assignedToId) || 'Unassigned',
          createdDate: caseItem.created_at || caseItem.createdDate,
          updatedDate: caseItem.updated_at || caseItem.lastUpdated,
          timelineBreachStatus: caseItem.timeline_breach_status || caseItem.timelineBreachStatus || 'Green',
          priority: caseItem.priority,
          agingDays,
          status: caseItem.status || 'Active',
          taxDemand: caseItem.tax_demand || caseItem.taxDemand,
          period: caseItem.period,
          authority: caseItem.authority,
          officeFileNo: caseItem.office_file_no || caseItem.officeFileNo,
          noticeNo: caseItem.notice_no || caseItem.noticeNo,
          reviewDate: caseItem.review_date || caseItem.reviewDate,
        };
      });

      return { data: reportData };
    } catch (error) {
      console.error('Error fetching case report:', error);
      return { data: [] };
    }
  },

  // Get hearing reports with filters
  getHearingReport: async (filters: any): Promise<{ data: any[] }> => {
    try {
      const { storageManager } = await import('@/data/StorageManager');
      const storage = storageManager.getStorage();

      const hearings = await storage.getAll('hearings');
      const cases = await storage.getAll('cases');
      const clients = await storage.getAll('clients');
      const courts = await storage.getAll('courts');
      const employees = await storage.getAll('employees');
      const judges = await storage.getAll('judges');

      // Helper to validate UUID format
      const isValidUUID = (str: string) => {
        if (!str) return false;
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
      };

      const caseMap = new Map(cases.map((c: any) => [c.id, c]));
      const clientMap = new Map(clients.map((c: any) => [c.id, c.display_name || c.name || 'Unknown']));
      const courtMap = new Map(courts.map((c: any) => [c.id, c.name]));
      const judgeMap = new Map(judges.map((j: any) => [j.id, j.name]));
      const employeeMap = new Map(employees.map((e: any) => [e.id, e.full_name || e.name || 'Unknown']));

      let filteredHearings = hearings;

      if (filters.dateRange) {
        const { start, end } = filters.dateRange;
        filteredHearings = filteredHearings.filter((h: any) => {
          const hearingDate = new Date(h.hearing_date || h.date);
          return hearingDate >= new Date(start) && hearingDate <= new Date(end);
        });
      }

      if (filters.courtId) {
        filteredHearings = filteredHearings.filter((h: any) => (h.court_id || h.courtId) === filters.courtId);
      }

      if (filters.judgeId) {
        filteredHearings = filteredHearings.filter((h: any) => {
          const hearingJudgeName = h.judge_name || '';
          
          // If hearing's judge_name is a UUID, compare UUIDs directly
          if (isValidUUID(hearingJudgeName)) {
            return hearingJudgeName === filters.judgeId;
          }
          
          // If hearing's judge_name is plain text, look up the selected judge's name and compare
          const selectedJudgeName = judgeMap.get(filters.judgeId);
          if (selectedJudgeName) {
            return hearingJudgeName.toLowerCase() === selectedJudgeName.toLowerCase();
          }
          
          return false;
        });
      }

      if (filters.status) {
        filteredHearings = filteredHearings.filter((h: any) => h.status === filters.status);
      }

      if (filters.ownerId) {
        filteredHearings = filteredHearings.filter((h: any) => {
          const relatedCase = caseMap.get(h.case_id || h.caseId);
          if (!relatedCase) return false;
          
          // Compare case's assigned_to with selected ownerId
          const caseOwnerId = relatedCase.assigned_to || relatedCase.assignedToId;
          return caseOwnerId === filters.ownerId;
        });
      }

      const reportData = filteredHearings.map((hearing: any) => {
        const relatedCase = caseMap.get(hearing.case_id || hearing.caseId);
        const clientId = relatedCase?.client_id || relatedCase?.clientId;

        return {
          id: hearing.id,
          caseId: hearing.case_id || hearing.caseId,
          caseTitle: relatedCase?.title || 'Unknown',
          client: clientId ? (clientMap.get(clientId) || 'Unknown') : 'Unknown',
          owner: relatedCase?.assigned_to ? (employeeMap.get(relatedCase.assigned_to) || 'Unassigned') : 'Unassigned',
          date: hearing.hearing_date || hearing.date,
          time: hearing.time || hearing.start_time || '10:00',
          court: courtMap.get(hearing.court_id || hearing.courtId) || 'Unknown',
          bench: hearing.bench || 'N/A',
          judge: (() => {
            const judgeName = hearing.judge_name;
            if (!judgeName) return 'Unknown';
            if (isValidUUID(judgeName)) {
              return judgeMap.get(judgeName) || 'Unknown';
            }
            return judgeName; // Use the text name directly
          })(),
          type: hearing.purpose || 'Scheduled',
          status: hearing.status || 'Scheduled',
        };
      });

      return { data: reportData };
    } catch (error) {
      console.error('Error fetching hearing report:', error);
      return { data: [] };
    }
  },

  // Get Timeline Breach reports with filters
  getTimelineBreachReport: async (filters: any): Promise<{ data: any[] }> => {
    try {
      const { storageManager } = await import('@/data/StorageManager');
      const storage = storageManager.getStorage();

      const cases = await storage.getAll('cases');
      const clients = await storage.getAll('clients');
      const employees = await storage.getAll('employees');

      const clientMap = new Map(clients.map((c: any) => [c.id, c.display_name || c.name || 'Unknown']));
      const employeeMap = new Map(employees.map((e: any) => [e.id, e.full_name || e.name || 'Unknown']));

      // Transform cases to add calculated timelineBreachStatus
      const casesWithSLA = cases.map((c: any) => {
        // Build case object with required fields for SLA calculation
        const caseObj = {
          ...c,
          lastUpdated: c.updated_at || c.lastUpdated || c.created_at,
          status: c.status || 'Active',
          nextHearing: c.next_hearing_date ? { date: c.next_hearing_date } : undefined,
        };
        
        // Calculate SLA status using the same logic as DataInitializer
        const timelineBreachStatus = calculateSLAStatus(caseObj as any);
        
        return {
          ...c,
          timelineBreachStatus,
        };
      });

      let filteredCases = casesWithSLA;

      if (filters.ragStatus) {
        filteredCases = filteredCases.filter((c: any) => (c.timeline_breach_status || c.timelineBreachStatus) === filters.ragStatus);
      }

      if (filters.stage) {
        const normalizedFilterStage = normalizeStage(filters.stage);
        filteredCases = filteredCases.filter((c: any) => normalizeStage(c.stage_code || c.currentStage) === normalizedFilterStage);
      }

      if (filters.ownerId) {
        filteredCases = filteredCases.filter((c: any) => (c.assigned_to || c.assignedToId) === filters.ownerId);
      }

      if (filters.clientId) {
        filteredCases = filteredCases.filter((c: any) => (c.client_id || c.clientId) === filters.clientId);
      }

      if (filters.dateRange) {
        const { start, end } = filters.dateRange;
        filteredCases = filteredCases.filter((c: any) => {
          const createdDate = new Date(c.created_at || c.createdDate);
          return createdDate >= new Date(start) && createdDate <= new Date(end);
        });
      }

      const reportData = filteredCases.map((caseItem: any) => {
        const agingDays = Math.floor(
          (new Date().getTime() - new Date(caseItem.created_at || caseItem.createdDate).getTime()) / (1000 * 60 * 60 * 24)
        );

        const breached = (caseItem.timeline_breach_status || caseItem.timelineBreachStatus) === 'Red' || 
          (caseItem.review_date || caseItem.reviewDate) && new Date(caseItem.review_date || caseItem.reviewDate) < new Date();

        return {
          caseId: caseItem.id,
          caseTitle: caseItem.title,
          client: clientMap.get(caseItem.client_id || caseItem.clientId) || 'Unknown',
          stage: caseItem.stage_code || caseItem.currentStage || 'Unknown',
          timelineDue: caseItem.review_date || caseItem.reviewDate || 'N/A',
          agingDays,
          ragStatus: caseItem.timeline_breach_status || caseItem.timelineBreachStatus || 'Green',
          owner: employeeMap.get(caseItem.assigned_to || caseItem.assignedToId) || 'Unassigned',
          breached,
        };
      });

      return { data: reportData };
    } catch (error) {
      console.error('Error fetching timeline breach report:', error);
      return { data: [] };
    }
  },

  // Backward compatibility - getSLAReport is an alias
  getSLAReport: async (filters: any): Promise<{ data: any[] }> => {
    // Use the same logic as getTimelineBreachReport
    return reportsService.getTimelineBreachReport(filters);
  },

  // Get task reports with filters
  getTaskReport: async (filters: any): Promise<{ data: any[] }> => {
    try {
      const { storageManager } = await import('@/data/StorageManager');
      const storage = storageManager.getStorage();

      const tasks = await storage.getAll('tasks');
      const cases = await storage.getAll('cases');
      const employees = await storage.getAll('employees');
      const clients = await storage.getAll('clients');

      const caseMap = new Map(cases.map((c: any) => [c.id, { 
        title: c.title, 
        caseNumber: c.case_number || c.caseNumber,
        clientId: c.client_id || c.clientId,
        assignedTo: c.assigned_to || c.assignedToId
      }]));
      const employeeMap = new Map(employees.map((e: any) => [e.id, e.full_name || e.name || 'Unknown']));
      const clientMap = new Map(clients.map((c: any) => [c.id, c.display_name || c.name || 'Unknown']));

      let filteredTasks = tasks;

      // Map ownerId to assigneeId for compatibility (tasks use assignee concept)
      const effectiveAssigneeId = filters.assigneeId || filters.ownerId;

      if (filters.status) {
        // Case-insensitive status comparison to handle different formats
        const normalizedStatus = filters.status.toLowerCase().replace('-', ' ');
        filteredTasks = filteredTasks.filter((t: any) => 
          (t.status || '').toLowerCase() === normalizedStatus ||
          t.status === filters.status
        );
      }

      if (effectiveAssigneeId) {
        filteredTasks = filteredTasks.filter((t: any) => (t.assigned_to || t.assignedToId) === effectiveAssigneeId);
      }

      if (filters.priority) {
        filteredTasks = filteredTasks.filter((t: any) => t.priority === filters.priority);
      }

      if (filters.clientId) {
        filteredTasks = filteredTasks.filter((t: any) => {
          const caseInfo = caseMap.get(t.case_id || t.caseId);
          return caseInfo && caseInfo.clientId === filters.clientId;
        });
      }

      if (filters.dateRange) {
        const { start, end } = filters.dateRange;
        filteredTasks = filteredTasks.filter((t: any) => {
          if (!t.due_date && !t.dueDate) return false;
          const dueDate = new Date(t.due_date || t.dueDate);
          return dueDate >= new Date(start) && dueDate <= new Date(end);
        });
      }

      const reportData = filteredTasks.map((task: any) => {
        const caseInfo = caseMap.get(task.case_id || task.caseId);
        const agingDays = Math.floor(
          (new Date().getTime() - new Date(task.created_at || task.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        );

        return {
          id: task.id,
          title: task.title,
          caseId: task.case_id || task.caseId,
          caseTitle: caseInfo?.title || 'Unknown',
          client: caseInfo ? clientMap.get(caseInfo.clientId) || 'Unknown Client' : 'Unknown Client',
          owner: caseInfo ? employeeMap.get(caseInfo.assignedTo) || 'Unassigned' : 'Unassigned',
          assignee: employeeMap.get(task.assigned_to || task.assignedToId) || task.assignedToName || 'Unassigned',
          dueDate: (task.due_date || task.dueDate) ? new Date(task.due_date || task.dueDate).toISOString().split('T')[0] : 'N/A',
          status: task.status as any,
          agingDays,
          escalated: (task.escalation_level || 0) > 0,
          priority: task.priority,
        };
      });

      return { data: reportData };
    } catch (error) {
      console.error('Error fetching task report:', error);
      return { data: [] };
    }
  },

  // Get client reports with filters
  getClientReport: async (filters: any): Promise<{ data: any[] }> => {
    try {
      const { storageManager } = await import('@/data/StorageManager');
      const storage = storageManager.getStorage();

      const clients = await storage.getAll('clients');
      const cases = await storage.getAll('cases');
      const hearings = await storage.getAll('hearings');

      let filteredClients = clients;

      if (filters.clientId) {
        filteredClients = filteredClients.filter((c: any) => c.id === filters.clientId);
      }

      const reportData = filteredClients.map((client: any) => {
        const clientCases = cases.filter((c: any) => (c.client_id || c.clientId) === client.id);
        const activeCases = clientCases.filter((c: any) => c.status === 'Active' || !c.status);

        const stageMix: { [key: string]: number } = {};
        clientCases.forEach((c: any) => {
          const stage = c.stage_code || c.currentStage || 'Unknown';
          stageMix[stage] = (stageMix[stage] || 0) + 1;
        });

        const slaBreaches = clientCases.filter((c: any) => (c.timeline_breach_status || c.timelineBreachStatus) === 'Red').length;

        const clientCaseIds = new Set(clientCases.map((c: any) => c.id));
        const clientHearings = hearings
          .filter((h: any) => clientCaseIds.has(h.case_id || h.caseId))
          .sort((a: any, b: any) => new Date(a.hearing_date || a.date).getTime() - new Date(b.hearing_date || b.date).getTime());
        const nextHearing = (clientHearings[0] as any)?.hearing_date || (clientHearings[0] as any)?.date;

        const totalValue = clientCases.reduce((sum: number, c: any) => sum + (c.tax_demand || c.taxDemand || c.amountInDispute || 0), 0);

        return {
          id: client.id,
          name: client.display_name || client.name || 'Unknown',
          totalCases: clientCases.length,
          activeCases: activeCases.length,
          stageMix,
          slaBreaches,
          nextHearing,
          totalValue,
        };
      });

      return { data: reportData };
    } catch (error) {
      console.error('Error fetching client report:', error);
      return { data: [] };
    }
  },

  // Get communication reports with filters
  getCommunicationReport: async (filters: any): Promise<{ data: any[] }> => {
    try {
      const { storageManager } = await import('@/data/StorageManager');
      const storage = storageManager.getStorage();

      const communications = await storage.getAll('communication_logs');
      const cases = await storage.getAll('cases');
      const clients = await storage.getAll('clients');

      const caseMap = new Map(cases.map((c: any) => [c.id, c]));
      const clientMap = new Map(clients.map((c: any) => [c.id, c.name || c.display_name]));

      let filteredComms = communications;

      // Apply filters
      if (filters.caseId) {
        filteredComms = filteredComms.filter((c: any) => c.case_id === filters.caseId);
      }

      if (filters.clientId) {
        filteredComms = filteredComms.filter((c: any) => c.client_id === filters.clientId);
      }

      if (filters.channel) {
        filteredComms = filteredComms.filter((c: any) => c.channel === filters.channel);
      }

      if (filters.status) {
        filteredComms = filteredComms.filter((c: any) => c.status === filters.status);
      }

      if (filters.dateRange) {
        const { start, end } = filters.dateRange;
        filteredComms = filteredComms.filter((c: any) => {
          const createdDate = new Date(c.created_at);
          return createdDate >= new Date(start) && createdDate <= new Date(end);
        });
      }

      const reportData = filteredComms.map((comm: any) => {
        const relatedCase = caseMap.get(comm.case_id);
        
        return {
          id: comm.id,
          date: comm.created_at,
          caseId: comm.case_id,
          caseNumber: relatedCase?.caseNumber || relatedCase?.case_number || 'N/A',
          client: clientMap.get(comm.client_id) || 'Unknown',
          channel: comm.channel,
          to: comm.sent_to,
          status: comm.status,
          template: comm.subject || 'N/A'
        };
      });

      return { data: reportData };
    } catch (error) {
      console.error('Error fetching communication report:', error);
      return { data: [] };
    }
  },

  // Get form timeline reports with filters
  getFormTimelineReport: async (filters: any): Promise<{ data: any[] }> => {
    try {
      const { storageManager } = await import('@/data/StorageManager');
      const storage = storageManager.getStorage();

      const cases = await storage.getAll('cases');
      const clients = await storage.getAll('clients');

      const clientMap = new Map(clients.map((c: any) => [c.id, c.display_name || c.name || 'Unknown']));

      let filteredCases = cases;

      if (filters.clientId) {
        filteredCases = filteredCases.filter((c: any) => (c.client_id || c.clientId) === filters.clientId);
      }

      if (filters.stage) {
        filteredCases = filteredCases.filter((c: any) => (c.stage_code || c.currentStage) === filters.stage);
      }

      const reportData: any[] = [];

      filteredCases.forEach((caseItem: any) => {
        if (caseItem.generatedForms && caseItem.generatedForms.length > 0) {
          caseItem.generatedForms.forEach((form: any) => {
            const submissionDate = form.generatedDate;
            const daysElapsed = Math.floor(
              (new Date().getTime() - new Date(submissionDate).getTime()) / (1000 * 60 * 60 * 24)
            );

            let status: 'On Time' | 'Delayed' | 'Pending' = 'Pending';
            let ragStatus: 'Green' | 'Amber' | 'Red' = 'Green';

            if (form.status === 'Generated' || form.status === 'Uploaded') {
              if (daysElapsed <= 3) {
                status = 'On Time';
                ragStatus = 'Green';
              } else if (daysElapsed <= 7) {
                status = 'On Time';
                ragStatus = 'Amber';
              } else {
                status = 'Delayed';
                ragStatus = 'Red';
              }
            }

            reportData.push({
              id: `${caseItem.id}-${form.formCode}`,
              formCode: form.formCode,
              formTitle: form.formCode.replace(/_/g, '-'),
              caseId: caseItem.id,
              caseNumber: caseItem.case_number || caseItem.caseNumber || 'N/A',
              caseTitle: caseItem.title,
              client: clientMap.get(caseItem.client_id || caseItem.clientId) || 'Unknown',
              stage: caseItem.stage_code || caseItem.currentStage || 'Unknown',
              submissionDate,
              dueDate: undefined,
              status,
              daysElapsed,
              ragStatus,
            });
          });
        }
      });

      if (filters.dateRange) {
        const { start, end } = filters.dateRange;
        return {
          data: reportData.filter((r: any) => {
            const subDate = new Date(r.submissionDate);
            return subDate >= new Date(start) && subDate <= new Date(end);
          })
        };
      }

      return { data: reportData };
    } catch (error) {
      console.error('Error fetching form timeline report:', error);
      return { data: [] };
    }
  },

  /**
   * Renders a form template to PDF with user data
   * @param formCode - The form template code (e.g., 'GSTAT', 'ASMT10_REPLY')
   * @param caseId - The case ID for context
   * @param payload - User-filled form data
   * @returns Promise with blob and suggested filename
   */
  renderFormPDF: async (
    formCode: string, 
    caseId: string, 
    payload: any
  ): Promise<{ blob: Blob; suggestedFilename: string }> => {
    try {
      console.log(`[FormTemplates] Starting render for ${formCode}...`);
      
      // Load the form template
      const template = await formTemplatesService.loadFormTemplate(formCode);
      if (!template) {
        throw new Error(`Form template ${formCode} not found`);
      }

      // Validate the payload against the template
      const validationErrors = formTemplatesService.validateFormData(template, payload);
      if (validationErrors.length > 0) {
        console.error('Form validation errors:', validationErrors);
        throw new Error(`Form validation failed: ${validationErrors.map(e => e.message).join(', ')}`);
      }

      // Generate PDF content (mock implementation with structured HTML-like content)
      const pdfContent = generateFormPDFContent(template, payload);
      
      // Create blob with PDF-like content
      const blob = new Blob([pdfContent], { type: 'application/pdf' });
      
      // Generate suggested filename
      const mockCase: Case = { id: caseId } as Case;
      const suggestedFilename = formTemplatesService.generateFilename(template, mockCase);
      
      console.log(`[FormTemplates] ${formCode} render OK - Size: ${blob.size} bytes`);
      
      toast({
        title: "Form Generated",
        description: `${template.title} PDF generated successfully`,
      });
      
      return { blob, suggestedFilename };
      
    } catch (error) {
      console.error(`Error rendering form PDF for ${formCode}:`, error);
      toast({
        title: "Generation Failed",
        description: `Failed to generate ${formCode} PDF`,
        variant: "destructive"
      });
      throw error;
    }
  }
};

// Export individual functions for easier importing
export const getCaseReport = reportsService.getCaseReport;
export const getHearingReport = reportsService.getHearingReport;
export const getTimelineBreachReport = reportsService.getTimelineBreachReport;
export const getSLAReport = reportsService.getSLAReport; // Backward compatibility
export const getTaskReport = reportsService.getTaskReport;
export const getClientReport = reportsService.getClientReport;
export const getCommunicationReport = reportsService.getCommunicationReport;
export const getFormTimelineReport = reportsService.getFormTimelineReport;

/**
 * Generates structured PDF content from form template and data
 */
function generateFormPDFContent(template: FormTemplate, payload: any): string {
  const timestamp = new Date().toISOString();
  
  let content = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length ${calculateContentLength(template, payload)}
>>
stream
BT
/F1 24 Tf
50 750 Td
(${template.title}) Tj
0 -30 Td
/F1 12 Tf
(Generated: ${timestamp}) Tj
0 -40 Td
`;

  // Add form fields content
  template.fields.forEach((field, index) => {
    if (field.type === 'repeatable_group' && field.key === 'issues') {
      const issues = payload[field.key] || [];
      const issueCount = payload.issue_count || 1;
      
      content += `0 -40 Td
(ISSUES ADDRESSED:) Tj
`;
      
      issues.forEach((issue: any, issueIndex: number) => {
        content += `0 -30 Td
(ISSUE ${issueIndex + 1}:) Tj
`;
        
        field.fields?.forEach(subField => {
          const value = issue[subField.key] || '';
          const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
          
          content += `0 -20 Td
(${subField.label}: ${displayValue}) Tj
`;
        });
        
        content += `0 -15 Td
(---) Tj
`;
      });
    } else if (field.type !== 'repeatable_group') {
      const value = payload[field.key] || '';
      const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
      
      content += `0 -25 Td
(${field.label}: ${displayValue}) Tj
`;
    }
  });

  content += `ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000079 00000 n 
0000000173 00000 n 
0000000301 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
${content.length + 100}
%%EOF`;

  return content;
}

/**
 * Calculate approximate content length for PDF structure
 */
function calculateContentLength(template: FormTemplate, payload: any): number {
  let length = 200; // Base content length
  
  template.fields.forEach(field => {
    const value = payload[field.key] || '';
    const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
    length += field.label.length + displayValue.length + 20;
  });
  
  return length;
}
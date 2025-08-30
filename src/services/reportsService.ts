import { toast } from '@/hooks/use-toast';
import { AppAction } from '@/contexts/AppStateContext';

// Mock export service - in real app would integrate with external APIs
export const reportsService = {
  // Export case list to Excel/PDF
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
        filteredCases = filteredCases.filter(c => c.currentStage === filters.stage);
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
  }
};
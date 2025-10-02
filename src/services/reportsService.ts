import { toast } from '@/hooks/use-toast';
import { AppAction } from '@/contexts/AppStateContext';
import { formTemplatesService, type FormTemplate } from './formTemplatesService';
import { Case, Client } from '@/contexts/AppStateContext';

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
  },

  // Get case reports with filters
  getCaseReport: async (filters: any): Promise<{ data: any[] }> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock case report data
    const mockData = [
      {
        id: 'CS001',
        title: 'Property Dispute Case',
        client: 'ABC Corp',
        stage: 'Appeals',
        owner: 'John Doe',
        createdDate: '2024-01-15',
        updatedDate: '2024-08-15',
        slaStatus: 'Green',
        priority: 'High',
        agingDays: 45
      },
      {
        id: 'CS002',
        title: 'Contract Breach',
        client: 'XYZ Ltd',
        stage: 'Adjudication',
        owner: 'Jane Smith',
        createdDate: '2024-02-01',
        updatedDate: '2024-08-20',
        slaStatus: 'Amber',
        priority: 'Medium',
        agingDays: 30
      }
    ];
    
    return { data: mockData };
  },

  // Get hearing reports with filters
  getHearingReport: async (filters: any): Promise<{ data: any[] }> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockData = [
      {
        id: 'H001',
        caseId: 'CS001',
        caseTitle: 'Property Dispute Case',
        client: 'ABC Corp',
        date: '2024-09-15',
        time: '10:30 AM',
        court: 'High Court',
        judge: 'Justice Kumar',
        status: 'Scheduled'
      }
    ];
    
    return { data: mockData };
  },

  // Get Timeline Breach reports with filters
  getTimelineBreachReport: async (filters: any): Promise<{ data: any[] }> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockData = [
      {
        caseId: 'CS001',
        caseTitle: 'Property Dispute Case',
        client: 'ABC Corp',
        stage: 'Appeals',
        timelineDue: '2024-09-30',
        agingDays: 45,
        ragStatus: 'Green',
        owner: 'John Doe',
        breached: false
      }
    ];
    
    return { data: mockData };
  },

  // Backward compatibility - getSLAReport is an alias
  getSLAReport: async (filters: any): Promise<{ data: any[] }> => {
    // Direct implementation to avoid circular reference
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockData = [
      {
        caseId: 'CS001',
        caseTitle: 'Property Dispute Case',
        client: 'ABC Corp',
        stage: 'Appeals',
        timelineDue: '2024-09-30',
        agingDays: 45,
        ragStatus: 'Green',
        owner: 'John Doe',
        breached: false
      }
    ];
    
    return { data: mockData };
  },

  // Get task reports with filters
  getTaskReport: async (filters: any): Promise<{ data: any[] }> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockData = [
      {
        id: 'T001',
        title: 'Review Documents',
        caseId: 'CS001',
        caseTitle: 'Property Dispute Case',
        assignee: 'John Doe',
        dueDate: '2024-09-20',
        status: 'In Progress',
        agingDays: 5,
        escalated: false,
        priority: 'High'
      }
    ];
    
    return { data: mockData };
  },

  // Get client reports with filters
  getClientReport: async (filters: any): Promise<{ data: any[] }> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockData = [
      {
        id: 'CL001',
        name: 'ABC Corp',
        totalCases: 15,
        activeCases: 8,
        stageMix: { 'Appeals': 3, 'Adjudication': 5 },
        slaBreaches: 2,
        nextHearing: '2024-09-15',
        totalValue: 2500000
      }
    ];
    
    return { data: mockData };
  },

  // Get communication reports with filters
  getCommunicationReport: async (filters: any): Promise<{ data: any[] }> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockData = [
      {
        id: 'COM001',
        date: '2024-08-25',
        caseId: 'CS001',
        client: 'ABC Corp',
        channel: 'Email',
        to: 'client@abccorp.com',
        status: 'Delivered',
        template: 'Hearing Notice'
      }
    ];
    
    return { data: mockData };
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
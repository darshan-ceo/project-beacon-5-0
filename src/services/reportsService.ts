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
    const value = payload[field.key] || '';
    const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
    
    content += `0 -25 Td
(${field.label}: ${displayValue}) Tj
`;
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
/**
 * Report Export Utility
 * Handles proper Excel and PDF exports for all report types
 */

import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';
import { format, parseISO, isValid } from 'date-fns';
import DOMPurify from 'dompurify';
import { ReportColumn } from '@/config/reportColumns';
import {
  CASE_REPORT_COLUMNS,
  HEARING_REPORT_COLUMNS,
  TASK_REPORT_COLUMNS,
  TIMELINE_BREACH_COLUMNS,
  CLIENT_SUMMARY_COLUMNS,
  COMMUNICATION_REPORT_COLUMNS,
  FORM_TIMELINE_COLUMNS,
  STATUTORY_DEADLINE_COLUMNS,
} from '@/config/reportColumns';

/**
 * Format cell value based on column type
 * @param row - The full row object from the data array
 * @param column - The column definition with type and optional getter
 */
function formatCellValue(row: any, column: ReportColumn): string {
  // Use custom getter if provided, otherwise use the key directly
  const rawValue = column.get ? column.get(row) : row[column.key];

  // Handle null/undefined AFTER getting the value
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return 'N/A';
  }

  switch (column.type) {
    case 'date': {
      try {
        let date: Date;
        if (typeof rawValue === 'string') {
          date = parseISO(rawValue);
        } else if (rawValue instanceof Date) {
          date = rawValue;
        } else {
          return 'N/A';
        }

        if (!isValid(date)) return 'N/A';
        
        const dateFormat = column.format || 'dd-MM-yyyy';
        return format(date, dateFormat);
      } catch (error) {
        return 'N/A';
      }
    }

    case 'currency': {
      const num = parseFloat(rawValue);
      if (isNaN(num)) return 'N/A';
      
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(num);
    }

    case 'number': {
      const num = parseFloat(rawValue);
      if (isNaN(num)) return 'N/A';
      return num.toString();
    }

    case 'boolean': {
      return rawValue ? 'Yes' : 'No';
    }

    case 'string':
    default: {
      return String(rawValue).trim() || 'N/A';
    }
  }
}

/**
 * Generate timestamped filename
 */
function generateFilename(prefix: string, extension: 'xlsx' | 'pdf'): string {
  const now = new Date();
  const dateStr = format(now, 'yyyy-MM-dd');
  const timeStr = format(now, 'HHmm');
  return `${prefix}-${dateStr}-${timeStr}.${extension}`;
}

/**
 * Export data to Excel format
 */
export async function exportReportToExcel(
  data: any[],
  columns: ReportColumn[],
  filename: string,
  sheetName: string = 'Report'
): Promise<void> {
  try {
    // Convert data to array format
    const headers = columns.map(col => col.header);
    const rows = data.map(row => 
      columns.map(col => formatCellValue(row, col))
    );

    const sheetData = [headers, ...rows];

    // Create workbook and worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Download
    XLSX.writeFile(workbook, filename, {
      bookType: 'xlsx',
      type: 'binary',
      compression: true
    });
  } catch (error) {
    console.error('Excel export error:', error);
    throw new Error('Failed to export to Excel format');
  }
}

/**
 * Inject PDF-specific styles into document head
 * Returns a cleanup function to remove the styles
 */
function injectPDFStyles(): () => void {
  const css = `
    .pdf-root { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; color: #1f2937; background: #ffffff; }
    .pdf-root .header { border-bottom: 3px solid #4F46E5; padding-bottom: 15px; margin-bottom: 20px; }
    .pdf-root h1 { color: #1f2937; font-size: 24px; font-weight: 600; margin-bottom: 8px; }
    .pdf-root .meta { color: #6b7280; font-size: 12px; }
    .pdf-root .pdf-table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; table-layout: fixed; }
    .pdf-root .pdf-table th { background-color: #4F46E5; color: #ffffff; padding: 10px 8px; text-align: left; font-weight: 600; border: 1px solid #4338CA; }
    .pdf-root .pdf-table td { padding: 8px; border: 1px solid #e5e7eb; color: #374151; word-wrap: break-word; }
    .pdf-root .pdf-table tr:nth-child(even) { background-color: #f9fafb; }
    .pdf-root .pdf-table tr:hover { background-color: #f3f4f6; }
    .pdf-root .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #6b7280; text-align: center; }
    .pdf-root .footer strong { color: #374151; }
    .badge-green { color: #059669; font-weight: 600; }
    .badge-amber { color: #D97706; font-weight: 600; }
    .badge-red { color: #DC2626; font-weight: 600; }
  `;
  
  const id = 'pdf-export-styles';
  let style = document.getElementById(id) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style') as HTMLStyleElement;
    style.id = id;
    style.type = 'text/css';
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
  }
  
  return () => {
    const s = document.getElementById(id);
    if (s) s.remove();
  };
}

/**
 * Generate HTML fragment for PDF (not a full document)
 */
function generatePDFHTML(data: any[], columns: ReportColumn[], title: string): string {
  const now = new Date();
  const dateStr = format(now, 'dd-MM-yyyy HH:mm');

  // Helper to get badge class based on status
  const getBadgeClass = (value: string, key: string): string => {
    const lowerValue = String(value).toLowerCase();
    
    if (key.includes('Status') || key.includes('ragStatus')) {
      if (lowerValue === 'green' || lowerValue === 'completed' || lowerValue === 'sent' || lowerValue === 'delivered') {
        return 'badge-green';
      }
      if (lowerValue === 'amber' || lowerValue === 'in progress' || lowerValue === 'pending') {
        return 'badge-amber';
      }
      if (lowerValue === 'red' || lowerValue === 'overdue' || lowerValue === 'failed') {
        return 'badge-red';
      }
    }
    
    return '';
  };

  // Generate "No records" row if data is empty
  const noDataRow = data.length === 0
    ? `<tr><td colspan="${columns.length}" style="padding:12px;color:#6b7280;text-align:center;">No records found</td></tr>`
    : '';

  return `
    <div class="pdf-root">
      <div class="header">
        <h1>${title}</h1>
        <div class="meta">Generated on: ${dateStr} | Total Records: ${data.length}</div>
      </div>
      <table class="pdf-table">
        <thead>
          <tr>
            ${columns.map(col => `<th>${col.header}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${noDataRow || data.map(row => `
            <tr>
              ${columns.map(col => {
                const formattedValue = formatCellValue(row, col);
                const badgeClass = getBadgeClass(formattedValue, col.key);
                return `<td class="${badgeClass}">${formattedValue}</td>`;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="footer">
        <strong>Project Beacon</strong> | Legal Case Management System
      </div>
    </div>
  `;
}

/**
 * Export data to PDF format
 */
export async function exportReportToPDF(
  data: any[],
  columns: ReportColumn[],
  filename: string,
  title: string
): Promise<void> {
  let cleanupStyles: (() => void) | null = null;
  let container: HTMLElement | null = null;

  try {
    // Determine orientation and set fixed width for A4
    const isLandscape = columns.length > 6;
    const pxWidth = isLandscape ? 1122 : 794; // A4 landscape : portrait in pixels

    // Inject styles into document head
    cleanupStyles = injectPDFStyles();

    // Generate HTML fragment
    const htmlContent = generatePDFHTML(data, columns, title);

    // Create off-screen container with fixed width and sanitized content
    container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '0';
    container.style.top = '0';
    container.style.width = pxWidth + 'px';
    container.style.zIndex = '-1';
    container.style.opacity = '0';
    container.style.pointerEvents = 'none';
    container.innerHTML = DOMPurify.sanitize(htmlContent, {
      ALLOWED_TAGS: ['div', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'h1', 'h2', 'span', 'p', 'b', 'strong', 'style'],
      ALLOWED_ATTR: ['style', 'class', 'colspan', 'rowspan']
    });
    document.body.appendChild(container);

    // Get the actual content element to pass to html2pdf
    const target = container.querySelector('.pdf-root') as HTMLElement;
    if (!target) {
      throw new Error('PDF root element not found');
    }

    // Debug logging
    console.debug('[PDF Export] Target element size:', {
      width: target.scrollWidth,
      height: target.scrollHeight,
      rows: data.length,
      columns: columns.length
    });

    // Configure html2pdf options
    const options = {
      margin: [10, 10, 10, 10] as [number, number, number, number],
      filename: filename,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: pxWidth
      },
      jsPDF: {
        unit: 'mm' as const,
        format: 'a4' as const,
        orientation: (isLandscape ? 'landscape' : 'portrait') as 'landscape' | 'portrait'
      },
      pagebreak: { mode: ['css', 'legacy'] as const }
    };

    // Generate and download PDF from the target element
    await html2pdf().set(options).from(target).save();
    
    console.debug('[PDF Export] Successfully generated PDF:', filename);
  } catch (error) {
    console.error('[PDF Export] Error:', error);
    throw new Error('Failed to export to PDF format');
  } finally {
    // Cleanup
    if (container && document.body.contains(container)) {
      document.body.removeChild(container);
    }
    if (cleanupStyles) {
      cleanupStyles();
    }
  }
}

/**
 * Export Case Report
 */
export async function exportCaseReport(
  data: any[],
  format: 'xlsx' | 'pdf'
): Promise<void> {
  const filename = generateFilename('Case-Report', format);
  const title = 'Case Report';
  
  if (format === 'pdf') {
    await exportReportToPDF(data, CASE_REPORT_COLUMNS, filename, title);
  } else {
    await exportReportToExcel(data, CASE_REPORT_COLUMNS, filename, 'Cases');
  }
}

/**
 * Export Hearing Report
 */
export async function exportHearingReport(
  data: any[],
  format: 'xlsx' | 'pdf'
): Promise<void> {
  const filename = generateFilename('Hearing-Report', format);
  const title = 'Hearing Report';
  
  if (format === 'pdf') {
    await exportReportToPDF(data, HEARING_REPORT_COLUMNS, filename, title);
  } else {
    await exportReportToExcel(data, HEARING_REPORT_COLUMNS, filename, 'Hearings');
  }
}

/**
 * Export Task Report
 */
export async function exportTaskReport(
  data: any[],
  format: 'xlsx' | 'pdf'
): Promise<void> {
  const filename = generateFilename('Task-Report', format);
  const title = 'Task & Escalation Report';
  
  if (format === 'pdf') {
    await exportReportToPDF(data, TASK_REPORT_COLUMNS, filename, title);
  } else {
    await exportReportToExcel(data, TASK_REPORT_COLUMNS, filename, 'Tasks');
  }
}

/**
 * Export Timeline Breach Report
 */
export async function exportTimelineBreachReport(
  data: any[],
  format: 'xlsx' | 'pdf'
): Promise<void> {
  const filename = generateFilename('Timeline-Breach-Report', format);
  const title = 'Timeline Breach & Compliance Report';
  
  if (format === 'pdf') {
    await exportReportToPDF(data, TIMELINE_BREACH_COLUMNS, filename, title);
  } else {
    await exportReportToExcel(data, TIMELINE_BREACH_COLUMNS, filename, 'Timeline Breach');
  }
}

/**
 * Export Client Summary Report
 */
export async function exportClientSummaryReport(
  data: any[],
  format: 'xlsx' | 'pdf'
): Promise<void> {
  const filename = generateFilename('Client-Summary-Report', format);
  const title = 'Client Summary Report';
  
  if (format === 'pdf') {
    await exportReportToPDF(data, CLIENT_SUMMARY_COLUMNS, filename, title);
  } else {
    await exportReportToExcel(data, CLIENT_SUMMARY_COLUMNS, filename, 'Client Summary');
  }
}

/**
 * Export Communication Report
 */
export async function exportCommunicationReport(
  data: any[],
  format: 'xlsx' | 'pdf'
): Promise<void> {
  const filename = generateFilename('Communication-Report', format);
  const title = 'Communication Report';
  
  if (format === 'pdf') {
    await exportReportToPDF(data, COMMUNICATION_REPORT_COLUMNS, filename, title);
  } else {
    await exportReportToExcel(data, COMMUNICATION_REPORT_COLUMNS, filename, 'Communications');
  }
}

/**
 * Export Form Timeline Report
 */
export async function exportFormTimelineReport(
  data: any[],
  format: 'xlsx' | 'pdf'
): Promise<void> {
  const filename = generateFilename('Form-Timeline-Report', format);
  const title = 'Form Timeline Report';
  
  if (format === 'pdf') {
    await exportReportToPDF(data, FORM_TIMELINE_COLUMNS, filename, title);
  } else {
    await exportReportToExcel(data, FORM_TIMELINE_COLUMNS, filename, 'Form Timeline');
  }
}

/**
 * Export Statutory Deadline Report
 */
export async function exportStatutoryDeadlineReport(
  data: any[],
  format: 'xlsx' | 'pdf'
): Promise<void> {
  const filename = generateFilename('Statutory-Deadlines-Report', format);
  const title = 'Statutory Deadlines Report';
  
  if (format === 'pdf') {
    await exportReportToPDF(data, STATUTORY_DEADLINE_COLUMNS, filename, title);
  } else {
    await exportReportToExcel(data, STATUTORY_DEADLINE_COLUMNS, filename, 'Statutory Deadlines');
  }
}

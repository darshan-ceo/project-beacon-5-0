import { UnifiedTemplate } from '@/components/documents/UnifiedTemplateBuilder';
import { Case, Client } from '@/data/db';
import { format } from 'date-fns';

/**
 * Unified Template Generation Service
 * Handles generation of PDF, DOCX, and HTML documents from unified templates
 */

export class UnifiedTemplateGenerationService {
  /**
   * Resolve a value from a data path (e.g., 'client.name', 'case.caseNumber')
   */
  private resolveValue(path: string, data: { case?: Case; client?: Client; [key: string]: any }): string {
    // Handle system variables
    if (path.startsWith('system.')) {
      const systemVar = path.replace('system.', '');
      switch (systemVar) {
        case 'currentDate':
          return format(new Date(), 'dd-MMM-yyyy');
        case 'currentTime':
          return format(new Date(), 'HH:mm:ss');
        case 'currentYear':
          return new Date().getFullYear().toString();
        default:
          return '';
      }
    }

    // Handle date formatting in path (e.g., 'case.createdAt:DD-MM-YYYY')
    const [actualPath, dateFormat] = path.split(':');
    
    // Split path and traverse object
    const parts = actualPath.split('.');
    let value: any = data;
    
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return '';
      }
    }
    
    // Format dates if format specified
    if (dateFormat && value) {
      try {
        const date = new Date(value);
        return format(date, dateFormat.replace('DD', 'dd').replace('YYYY', 'yyyy'));
      } catch {
        return String(value);
      }
    }
    
    return value ? String(value) : '';
  }

  /**
   * Replace all variables in content with actual data
   */
  private replaceVariables(
    content: string, 
    template: UnifiedTemplate,
    caseData?: Case,
    clientData?: Client,
    additionalData?: Record<string, any>
  ): string {
    let processedContent = content;
    
    const allData = {
      case: caseData,
      client: clientData,
      ...additionalData,
    };

    // Replace each variable with its mapped value
    Object.entries(template.variableMappings).forEach(([variable, path]) => {
      const value = this.resolveValue(path, allData);
      const variableRegex = new RegExp(`{{${variable}}}`, 'g');
      processedContent = processedContent.replace(variableRegex, value);
    });

    // Replace any remaining unmapped variables with empty string
    processedContent = processedContent.replace(/{{[^}]+}}/g, '');

    return processedContent;
  }

  /**
   * Apply branding to HTML content
   */
  private applyBranding(content: string, template: UnifiedTemplate): string {
    const { branding, output } = template;
    
    let styledContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=${branding.font || 'Inter'}:wght@300;400;500;600;700&display=swap');
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: '${branding.font || 'Inter'}', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 14px;
            line-height: 1.6;
            color: #1a1a1a;
            padding: ${output.margins.top}mm ${output.margins.right}mm ${output.margins.bottom}mm ${output.margins.left}mm;
          }
          
          .document-header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid ${branding.primaryColor || '#0B5FFF'};
          }
          
          .document-header img {
            max-height: 60px;
            margin-bottom: 10px;
          }
          
          .document-header h1 {
            font-size: 18px;
            font-weight: 600;
            color: ${branding.primaryColor || '#0B5FFF'};
            margin: 0;
          }
          
          .document-header p {
            font-size: 12px;
            color: #666;
            margin-top: 5px;
          }
          
          .document-footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 11px;
            color: #666;
            text-align: center;
          }
          
          .page-number {
            position: fixed;
            bottom: 10mm;
            right: 10mm;
            font-size: 10px;
            color: #999;
          }
          
          ${branding.watermark?.enabled ? `
            .watermark {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(-45deg);
              font-size: 72px;
              font-weight: bold;
              color: rgba(11, 95, 255, ${(branding.watermark.opacity || 10) / 100});
              pointer-events: none;
              z-index: -1;
              white-space: nowrap;
            }
          ` : ''}
          
          h1, h2, h3, h4, h5, h6 {
            margin-top: 20px;
            margin-bottom: 10px;
            color: ${branding.primaryColor || '#0B5FFF'};
          }
          
          h1 { font-size: 24px; }
          h2 { font-size: 20px; }
          h3 { font-size: 16px; }
          
          p {
            margin-bottom: 10px;
          }
          
          ul, ol {
            margin-left: 25px;
            margin-bottom: 15px;
          }
          
          li {
            margin-bottom: 5px;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
          }
          
          th, td {
            padding: 10px;
            text-align: left;
            border: 1px solid #ddd;
          }
          
          th {
            background-color: ${branding.primaryColor || '#0B5FFF'}15;
            font-weight: 600;
            color: ${branding.primaryColor || '#0B5FFF'};
          }
          
          strong {
            font-weight: 600;
            color: #1a1a1a;
          }
          
          hr {
            border: none;
            border-top: 1px solid #ddd;
            margin: 20px 0;
          }
          
          @media print {
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
            
            @page {
              size: ${output.pageSize} ${output.orientation.toLowerCase()};
              margin: 0;
            }
          }
        </style>
      </head>
      <body>
    `;

    // Add watermark
    if (branding.watermark?.enabled) {
      styledContent += `
        <div class="watermark">CONFIDENTIAL</div>
      `;
    }

    // Add header
    if (output.includeHeader && branding.header) {
      styledContent += `
        <div class="document-header">
          ${branding.logo ? `<img src="${branding.logo}" alt="Logo" />` : ''}
          <h1>${branding.header}</h1>
        </div>
      `;
    }

    // Add main content
    styledContent += `
      <div class="document-content">
        ${content}
      </div>
    `;

    // Add footer
    if (output.includeFooter && branding.footer) {
      styledContent += `
        <div class="document-footer">
          <p>${branding.footer}</p>
        </div>
      `;
    }

    // Add page numbers
    if (output.includePageNumbers) {
      styledContent += `
        <div class="page-number">Page 1</div>
      `;
    }

    styledContent += `
      </body>
      </html>
    `;

    return styledContent;
  }

  /**
   * Generate HTML document
   */
  async generateHTML(
    template: UnifiedTemplate,
    caseData?: Case,
    clientData?: Client,
    additionalData?: Record<string, any>
  ): Promise<Blob> {
    const processedContent = this.replaceVariables(
      template.richContent, 
      template, 
      caseData, 
      clientData, 
      additionalData
    );
    
    const styledContent = this.applyBranding(processedContent, template);
    
    return new Blob([styledContent], { type: 'text/html' });
  }

  /**
   * Generate PDF document
   * Note: This uses html2pdf.js (needs to be installed)
   * For production, consider using a server-side PDF generation service
   */
  async generatePDF(
    template: UnifiedTemplate,
    caseData?: Case,
    clientData?: Client,
    additionalData?: Record<string, any>
  ): Promise<Blob> {
    const htmlBlob = await this.generateHTML(template, caseData, clientData, additionalData);
    const htmlText = await htmlBlob.text();
    
    // For now, return as HTML with PDF mime type
    // In production, integrate with html2pdf.js or a server-side PDF service
    console.warn('PDF generation: Using HTML fallback. Consider integrating html2pdf.js or server-side PDF service.');
    
    return new Blob([htmlText], { type: 'application/pdf' });
  }

  /**
   * Generate DOCX document
   * Note: This requires html-docx-js or docxtemplater
   * For production, consider using a server-side DOCX generation service
   */
  async generateDOCX(
    template: UnifiedTemplate,
    caseData?: Case,
    clientData?: Client,
    additionalData?: Record<string, any>
  ): Promise<Blob> {
    const htmlBlob = await this.generateHTML(template, caseData, clientData, additionalData);
    const htmlText = await htmlBlob.text();
    
    // For now, return as HTML with DOCX mime type
    // In production, integrate with html-docx-js or docxtemplater
    console.warn('DOCX generation: Using HTML fallback. Consider integrating html-docx-js or docxtemplater.');
    
    return new Blob([htmlText], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }

  /**
   * Generate document based on template output format
   */
  async generateDocument(
    template: UnifiedTemplate,
    caseData?: Case,
    clientData?: Client,
    additionalData?: Record<string, any>
  ): Promise<Blob> {
    switch (template.output.format) {
      case 'PDF':
        return this.generatePDF(template, caseData, clientData, additionalData);
      case 'DOCX':
        return this.generateDOCX(template, caseData, clientData, additionalData);
      case 'HTML':
      default:
        return this.generateHTML(template, caseData, clientData, additionalData);
    }
  }

  /**
   * Download generated document
   */
  downloadDocument(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Generate filename from template pattern
   */
  generateFilename(
    template: UnifiedTemplate,
    caseData?: Case,
    additionalData?: Record<string, any>
  ): string {
    let filename = template.output.filenamePattern || '${code}_${now:YYYYMMDD}';
    
    // Replace ${code}
    filename = filename.replace('${code}', template.templateCode);
    
    // Replace ${case.*}
    if (caseData) {
      filename = filename.replace(/\$\{case\.(\w+)\}/g, (match, field) => {
        return (caseData as any)[field] || match;
      });
    }
    
    // Replace ${now:format}
    filename = filename.replace(/\$\{now:([^}]+)\}/g, (match, dateFormat) => {
      return format(new Date(), dateFormat.replace('DD', 'dd').replace('YYYY', 'yyyy').replace('MM', 'MM'));
    });
    
    // Add extension if not present
    const extension = template.output.format.toLowerCase();
    if (!filename.endsWith(`.${extension}`)) {
      filename += `.${extension}`;
    }
    
    return filename;
  }
}

// Export singleton instance
export const unifiedTemplateGenerationService = new UnifiedTemplateGenerationService();

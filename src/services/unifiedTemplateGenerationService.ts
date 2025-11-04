import { UnifiedTemplate } from '@/components/documents/UnifiedTemplateBuilder';
import { Case, Client } from '@/contexts/AppStateContext';
import { format } from 'date-fns';
import html2pdf from 'html2pdf.js';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import DOMPurify from 'dompurify';

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
   * Generate PDF document using html2pdf.js
   */
  async generatePDF(
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
    
    // Create temporary container with sanitized content
    const container = document.createElement('div');
    container.innerHTML = DOMPurify.sanitize(styledContent, {
      ALLOWED_TAGS: ['p', 'div', 'span', 'b', 'i', 'u', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'style'],
      ALLOWED_ATTR: ['style', 'class', 'colspan', 'rowspan', 'src', 'alt', 'width', 'height']
    });
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    document.body.appendChild(container);
    
    try {
      const topMargin = typeof template.output.margins.top === 'number' 
        ? template.output.margins.top 
        : parseFloat(template.output.margins.top) || 10;
      const rightMargin = typeof template.output.margins.right === 'number'
        ? template.output.margins.right
        : parseFloat(template.output.margins.right) || 10;
      const bottomMargin = typeof template.output.margins.bottom === 'number'
        ? template.output.margins.bottom
        : parseFloat(template.output.margins.bottom) || 10;
      const leftMargin = typeof template.output.margins.left === 'number'
        ? template.output.margins.left
        : parseFloat(template.output.margins.left) || 10;
        
      const margins: [number, number, number, number] = [
        topMargin,
        rightMargin,
        bottomMargin,
        leftMargin
      ];
      
      const opt = {
        margin: margins,
        filename: 'document.pdf',
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { 
          unit: 'mm', 
          format: template.output.pageSize.toLowerCase(), 
          orientation: template.output.orientation.toLowerCase() as 'portrait' | 'landscape'
        }
      };
      
      const pdfBlob = await html2pdf().set(opt).from(container).outputPdf('blob');
      return pdfBlob;
    } finally {
      document.body.removeChild(container);
    }
  }

  /**
   * Generate DOCX document using docxtemplater
   * Converts HTML to DOCX with proper formatting
   */
  async generateDOCX(
    template: UnifiedTemplate,
    caseData?: Case,
    clientData?: Client,
    additionalData?: Record<string, any>
  ): Promise<Blob> {
    try {
      // Create a simple DOCX template with the HTML content
      const processedContent = this.replaceVariables(
        template.richContent, 
        template, 
        caseData, 
        clientData, 
        additionalData
      );

      // Convert HTML to plain text for DOCX (simple approach)
      // For production, use a proper HTML to DOCX converter like mammoth or html-docx-js
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = DOMPurify.sanitize(processedContent, {
        ALLOWED_TAGS: ['p', 'div', 'span', 'b', 'i', 'u', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'h1', 'h2', 'h3'],
        ALLOWED_ATTR: ['style', 'class']
      });
      const textContent = tempDiv.textContent || tempDiv.innerText || '';

      // Create a minimal DOCX structure
      const zip = new PizZip();
      
      // Create document.xml with the content
      const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
          <w:body>
            <w:p>
              <w:r>
                <w:t>${textContent}</w:t>
              </w:r>
            </w:p>
          </w:body>
        </w:document>`;

      zip.folder('word')!.file('document.xml', documentXml);
      
      // Create _rels/.rels
      const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
          <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
        </Relationships>`;
      
      zip.folder('_rels')!.file('.rels', relsXml);
      
      // Create [Content_Types].xml
      const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
          <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
          <Default Extension="xml" ContentType="application/xml"/>
          <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
        </Types>`;
      
      zip.file('[Content_Types].xml', contentTypesXml);

      const blob = zip.generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      return blob;
    } catch (error) {
      console.error('[DOCX Generator] Error generating DOCX:', error);
      throw new Error('Failed to generate DOCX document');
    }
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

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
   * Normalize template to ensure all nested properties exist with defaults
   * Prevents "Cannot read properties of undefined" errors
   */
  /**
   * Normalize template to ensure all nested properties exist with defaults
   * Handles legacy schema detection and conversion for backward compatibility
   */
  private normalizeTemplate(template: UnifiedTemplate): UnifiedTemplate {
    const defaultBranding = {
      font: 'Inter',
      primaryColor: '#0B5FFF',
      accentColor: '#00C2A8',
      header: '',
      footer: '',
      logo: '',
      watermark: { enabled: false, opacity: 10 }
    };

    const defaultOutput = {
      format: 'PDF' as const,
      orientation: 'Portrait' as const,
      pageSize: 'A4' as const,
      includeHeader: true,
      includeFooter: true,
      includePageNumbers: true,
      filenamePattern: '{{title}}_{{caseNumber}}',
      margins: { top: 10, bottom: 10, left: 10, right: 10 }
    };

    // Detect legacy output structure (has filename but no format)
    // Legacy format: { filename: "...", dms_folder_by_stage: true, timeline_event: "..." }
    // Modern format: { format: "PDF", orientation: "Portrait", pageSize: "A4", margins: {...} }
    const rawOutput = template.output as any;
    const hasLegacyOutput = rawOutput && 
      ('filename' in rawOutput || 'dms_folder_by_stage' in rawOutput || 'timeline_event' in rawOutput) && 
      !('format' in rawOutput);

    console.log('[Template Normalizer] Legacy output detected:', hasLegacyOutput, rawOutput);

    // Build normalized output - if legacy, start fresh from defaults and only preserve filenamePattern
    let normalizedOutput;
    if (hasLegacyOutput) {
      normalizedOutput = {
        ...defaultOutput,
        // Preserve legacy filename pattern if present
        filenamePattern: rawOutput.filename || defaultOutput.filenamePattern,
      };
    } else {
      normalizedOutput = {
        ...defaultOutput,
        ...(template.output || {}),
        margins: {
          ...defaultOutput.margins,
          ...(template.output?.margins || {})
        }
      };
    }

    return {
      ...template,
      branding: {
        ...defaultBranding,
        ...(template.branding || {}),
        watermark: {
          ...defaultBranding.watermark,
          ...(template.branding?.watermark || {})
        }
      },
      output: normalizedOutput,
      variableMappings: template.variableMappings || {},
      fields: template.fields || []
    };
  }

  /**
   * Convert snake_case to camelCase
   */
  private toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  /**
   * Common field aliases for backward compatibility with older templates
   */
  private readonly fieldAliases: Record<string, string> = {
    'client.display_name': 'client.name',
    'client.displayName': 'client.name',
    'case.case_number': 'case.caseNumber',
    'case.current_stage': 'case.currentStage',
    'case.notice_type': 'case.noticeType',
    'case.notice_date': 'case.noticeDate',
    'case.notice_no': 'case.noticeNo',
    'case.demand_amount': 'case.demandAmount',
  };

  /**
   * Resolve a value from a data path (e.g., 'client.name', 'case.caseNumber')
   * Supports snake_case → camelCase fallback for backward compatibility
   */
  private resolveValue(path: string, data: { case?: Case; client?: Client; [key: string]: any }): string {
    // Handle system variables
    if (path.startsWith('system.')) {
      const systemVar = path.replace('system.', '');
      switch (systemVar) {
        case 'currentDate':
        case 'current_date':
          return format(new Date(), 'dd-MMM-yyyy');
        case 'currentTime':
        case 'current_time':
          return format(new Date(), 'HH:mm:ss');
        case 'currentYear':
        case 'current_year':
          return new Date().getFullYear().toString();
        default:
          return '';
      }
    }

    // Check if there's an alias for this path
    const aliasedPath = this.fieldAliases[path] || path;

    // Handle date formatting in path (e.g., 'case.createdAt:DD-MM-YYYY')
    const [actualPath, dateFormat] = aliasedPath.split(':');
    
    // Split path and traverse object
    const parts = actualPath.split('.');
    let value: any = data;
    
    for (const part of parts) {
      if (value && typeof value === 'object') {
        // Try original key first
        if (part in value) {
          value = value[part];
        } 
        // Try camelCase version if original not found (for snake_case keys)
        else {
          const camelCasePart = this.toCamelCase(part);
          if (camelCasePart in value) {
            value = value[camelCasePart];
          } else {
            // Try snake_case version if original not found (for camelCase keys)
            const snakeCasePart = part.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            if (snakeCasePart in value) {
              value = value[snakeCasePart];
            } else {
              return '';
            }
          }
        }
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
    
    return value != null ? String(value) : '';
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
    // Escape special regex characters in variable name (especially dots in paths like client.display_name)
    Object.entries(template.variableMappings).forEach(([variable, path]) => {
      const value = this.resolveValue(path, allData);
      const escapedVariable = variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const variableRegex = new RegExp(`\\{\\{${escapedVariable}\\}\\}`, 'g');
      processedContent = processedContent.replace(variableRegex, value);
    });

    // Direct path replacement for {{case.xxx}}, {{client.xxx}}, and {{system.xxx}} patterns
    // This handles variables that weren't in variableMappings but follow the dot-notation pattern
    processedContent = processedContent.replace(
      /\{\{(case|client|system)\.([^}]+)\}\}/g, 
      (match, prefix, field) => {
        const path = `${prefix}.${field}`;
        return this.resolveValue(path, allData) || '';
      }
    );

    // Replace any remaining unmapped variables with empty string
    processedContent = processedContent.replace(/\{\{[^}]+\}\}/g, '');

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
    // Normalize template to ensure all nested properties exist
    const normalizedTemplate = this.normalizeTemplate(template);
    
    const processedContent = this.replaceVariables(
      normalizedTemplate.richContent, 
      normalizedTemplate, 
      caseData, 
      clientData, 
      additionalData
    );
    
    const styledContent = this.applyBranding(processedContent, normalizedTemplate);
    
    return new Blob([styledContent], { type: 'text/html' });
  }

  /**
   * Build CSS styles for PDF generation (extracted from branding and output settings)
   */
  private buildPdfStyles(template: UnifiedTemplate): string {
    const { branding, output } = template;
    return `
      @import url('https://fonts.googleapis.com/css2?family=${branding.font || 'Inter'}:wght@300;400;500;600;700&display=swap');
      
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      .pdf-container {
        font-family: '${branding.font || 'Inter'}', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 14px;
        line-height: 1.6;
        color: #1a1a1a;
        background: white;
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
      
      .document-footer {
        margin-top: 40px;
        padding-top: 20px;
        border-top: 1px solid #ddd;
        font-size: 11px;
        color: #666;
        text-align: center;
      }
      
      .page-number {
        position: absolute;
        bottom: 10mm;
        right: 10mm;
        font-size: 10px;
        color: #999;
      }
      
      ${branding.watermark?.enabled ? `
        .watermark {
          position: absolute;
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
    `;
  }

  /**
   * Get page width in mm based on page size and orientation
   */
  private getPageWidthMm(pageSize: string, orientation: string): number {
    const sizes: Record<string, { width: number; height: number }> = {
      'a4': { width: 210, height: 297 },
      'letter': { width: 216, height: 279 },
      'legal': { width: 216, height: 356 },
    };
    const size = sizes[pageSize.toLowerCase()] || sizes.a4;
    return orientation.toLowerCase() === 'landscape' ? size.height : size.width;
  }

  /**
   * Generate PDF document using html2pdf.js
   * Uses a robust DOM structure with explicit sizing to ensure reliable capture
   */
  async generatePDF(
    template: UnifiedTemplate,
    caseData?: Case,
    clientData?: Client,
    additionalData?: Record<string, any>
  ): Promise<Blob> {
    // Normalize template to ensure all nested properties exist
    const normalizedTemplate = this.normalizeTemplate(template);
    
    // Process content with variable replacement
    const processedContent = this.replaceVariables(
      normalizedTemplate.richContent, 
      normalizedTemplate, 
      caseData, 
      clientData, 
      additionalData
    );

    // Sanitize only the content HTML (not a full document wrapper)
    const sanitizedContent = DOMPurify.sanitize(processedContent, {
      ALLOWED_TAGS: ['p', 'div', 'span', 'b', 'i', 'u', 'br', 'strong', 'em', 'ul', 'ol', 'li', 
                     'table', 'tr', 'td', 'th', 'thead', 'tbody', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'hr'],
      ALLOWED_ATTR: ['style', 'class', 'colspan', 'rowspan', 'src', 'alt', 'width', 'height']
    });

    // Debug logging
    console.log('[PDF Generator] Template:', normalizedTemplate.templateCode, normalizedTemplate.title);
    console.log('[PDF Generator] Rich content length:', normalizedTemplate.richContent?.length || 0);
    console.log('[PDF Generator] Processed content length:', processedContent.length);
    console.log('[PDF Generator] Processed content preview:', processedContent.slice(0, 200));
    console.log('[PDF Generator] Sanitized content length:', sanitizedContent.length);

    // Create container with explicit dimensions matching page size
    const pageWidth = this.getPageWidthMm(normalizedTemplate.output.pageSize, normalizedTemplate.output.orientation);
    const container = document.createElement('div');
    container.className = 'pdf-container';
    container.style.cssText = `
      position: fixed;
      left: 0;
      top: 0;
      visibility: hidden;
      width: ${pageWidth}mm;
      min-height: 297mm;
      background: white;
      z-index: -9999;
    `;
    
    // Build the PDF CSS and inject via style element
    const styleElement = document.createElement('style');
    styleElement.textContent = this.buildPdfStyles(normalizedTemplate);
    container.appendChild(styleElement);

    // Build content structure
    const { branding, output } = normalizedTemplate;

    // Add watermark
    if (branding.watermark?.enabled) {
      const watermark = document.createElement('div');
      watermark.className = 'watermark';
      watermark.textContent = 'CONFIDENTIAL';
      container.appendChild(watermark);
    }

    // Add header
    if (output.includeHeader && branding.header) {
      const header = document.createElement('div');
      header.className = 'document-header';
      header.innerHTML = DOMPurify.sanitize(`
        ${branding.logo ? `<img src="${branding.logo}" alt="Logo" />` : ''}
        <h1>${branding.header}</h1>
      `);
      container.appendChild(header);
    }

    // Add main content
    const contentDiv = document.createElement('div');
    contentDiv.className = 'document-content';
    contentDiv.innerHTML = sanitizedContent;
    container.appendChild(contentDiv);

    // Add footer
    if (output.includeFooter && branding.footer) {
      const footer = document.createElement('div');
      footer.className = 'document-footer';
      footer.innerHTML = DOMPurify.sanitize(`<p>${branding.footer}</p>`);
      container.appendChild(footer);
    }

    // Add page numbers
    if (output.includePageNumbers) {
      const pageNum = document.createElement('div');
      pageNum.className = 'page-number';
      pageNum.textContent = 'Page 1';
      container.appendChild(pageNum);
    }

    // Append to document body
    document.body.appendChild(container);
    
    // Force layout calculation
    const rect = container.getBoundingClientRect();
    console.log('[PDF Generator] Container dimensions:', { width: rect.width, height: rect.height });
    console.log('[PDF Generator] Container innerHTML length:', container.innerHTML.length);
    
    try {
      const topMargin = typeof normalizedTemplate.output.margins.top === 'number' 
        ? normalizedTemplate.output.margins.top 
        : parseFloat(normalizedTemplate.output.margins.top as unknown as string) || 10;
      const rightMargin = typeof normalizedTemplate.output.margins.right === 'number'
        ? normalizedTemplate.output.margins.right
        : parseFloat(normalizedTemplate.output.margins.right as unknown as string) || 10;
      const bottomMargin = typeof normalizedTemplate.output.margins.bottom === 'number'
        ? normalizedTemplate.output.margins.bottom
        : parseFloat(normalizedTemplate.output.margins.bottom as unknown as string) || 10;
      const leftMargin = typeof normalizedTemplate.output.margins.left === 'number'
        ? normalizedTemplate.output.margins.left
        : parseFloat(normalizedTemplate.output.margins.left as unknown as string) || 10;
        
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
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          logging: false,
          allowTaint: true,
          width: rect.width,
          windowWidth: rect.width
        },
        jsPDF: { 
          unit: 'mm', 
          format: normalizedTemplate.output.pageSize.toLowerCase(), 
          orientation: normalizedTemplate.output.orientation.toLowerCase() as 'portrait' | 'landscape'
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
      // Normalize template to ensure all nested properties exist
      const normalizedTemplate = this.normalizeTemplate(template);
      
      // Create a simple DOCX template with the HTML content
      const processedContent = this.replaceVariables(
        normalizedTemplate.richContent, 
        normalizedTemplate, 
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
    // Normalize template to ensure all nested properties exist
    const normalizedTemplate = this.normalizeTemplate(template);
    
    switch (normalizedTemplate.output.format) {
      case 'PDF':
        return this.generatePDF(normalizedTemplate, caseData, clientData, additionalData);
      case 'DOCX':
        return this.generateDOCX(normalizedTemplate, caseData, clientData, additionalData);
      case 'HTML':
      default:
        return this.generateHTML(normalizedTemplate, caseData, clientData, additionalData);
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
   * Handles both ${} and {{}} placeholder styles for backward compatibility
   */
  generateFilename(
    template: UnifiedTemplate,
    caseData?: Case,
    additionalData?: Record<string, any>
  ): string {
    // Normalize template to ensure all nested properties exist
    const normalizedTemplate = this.normalizeTemplate(template);
    
    let filename = normalizedTemplate.output.filenamePattern || '${code}_${now:YYYYMMDD}';
    
    // Replace ${code} and {{code}} style
    filename = filename.replace(/\$\{code\}|{{code}}/gi, normalizedTemplate.templateCode || 'document');
    
    // Replace ${title} and {{title}}
    filename = filename.replace(/\$\{title\}|{{title}}/gi, normalizedTemplate.title || 'document');
    
    // Replace ${case.*} and {{case.*}} patterns
    if (caseData) {
      filename = filename.replace(
        /\$\{case\.(\w+)\}|{{case\.(\w+)}}/g, 
        (match, field1, field2) => {
          const field = field1 || field2;
          return (caseData as any)[field] || '';
        }
      );
      // Handle {{caseNumber}} shorthand (common pattern)
      filename = filename.replace(/{{caseNumber}}/gi, caseData.caseNumber || '');
    }
    
    // Replace ${now:format} and {{now:format}} patterns
    filename = filename.replace(
      /\$\{now:([^}]+)\}|{{now:([^}]+)}}/g, 
      (match, fmt1, fmt2) => {
        const dateFormat = fmt1 || fmt2;
        return format(new Date(), dateFormat.replace('DD', 'dd').replace('YYYY', 'yyyy'));
      }
    );
    
    // Add extension if not present
    const extension = normalizedTemplate.output.format.toLowerCase();
    if (!filename.endsWith(`.${extension}`)) {
      filename += `.${extension}`;
    }
    
    return filename;
  }
}

// Export singleton instance
export const unifiedTemplateGenerationService = new UnifiedTemplateGenerationService();

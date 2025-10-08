/**
 * DOCX Template Service
 * Handles DOCX template uploads, variable detection, and document generation
 */

import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { saveAs } from 'file-saver';
import { Case, Client } from '@/contexts/AppStateContext';

export interface DetectedVariable {
  placeholder: string;
  occurrences: number;
  suggestedMapping?: string;
}

export interface VariableMapping {
  placeholder: string;
  systemPath: string;
  label: string;
}

export interface DocxTemplateData {
  fileName: string;
  fileBlob: Blob;
  detectedVariables: DetectedVariable[];
  variableMappings: VariableMapping[];
}

class DocxTemplateService {
  /**
   * Parse uploaded DOCX file and detect variable placeholders
   * Uses resilient parsing with fallback to raw XML if Docxtemplater fails
   */
  async parseDocxTemplate(file: File): Promise<{
    fileBlob: Blob;
    detectedVariables: DetectedVariable[];
  }> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = new PizZip(arrayBuffer);
      
      let fullText = '';
      let parsingMode = 'docxtemplater';
      
      // Primary path: Try Docxtemplater with {{ }} delimiters
      try {
        const doc = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
          delimiters: { start: '{{', end: '}}' }
        });
        fullText = doc.getFullText();
        console.log('[DOCX Parser] Using Docxtemplater mode');
      } catch (docxError) {
        // Fallback path: Extract text from raw XML parts
        console.warn('[DOCX Parser] Docxtemplater failed, using XML fallback:', docxError);
        parsingMode = 'fallback';
        
        const xmlParts = [
          'word/document.xml',
          'word/header1.xml',
          'word/header2.xml',
          'word/header3.xml',
          'word/footer1.xml',
          'word/footer2.xml',
          'word/footer3.xml'
        ];
        
        for (const part of xmlParts) {
          try {
            const xmlContent = zip.file(part)?.asText();
            if (xmlContent) {
              // Strip XML tags and decode HTML entities
              const stripped = xmlContent
                .replace(/<[^>]*>/g, ' ')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"')
                .replace(/&apos;/g, "'");
              fullText += stripped + ' ';
            }
          } catch (e) {
            // Part doesn't exist, skip
          }
        }
      }
      
      // Find all {{variable}} placeholders with whitespace support and dot paths
      const variableRegex = /\{\{\s*([a-zA-Z0-9._-]+)\s*\}\}/g;
      const matches = [...fullText.matchAll(variableRegex)];
      
      console.log(`[DOCX Parser] Found ${matches.length} variable matches using ${parsingMode} mode`);
      
      // Count occurrences and suggest mappings
      const variableCounts = new Map<string, number>();
      matches.forEach(match => {
        const placeholder = match[1].trim();
        variableCounts.set(placeholder, (variableCounts.get(placeholder) || 0) + 1);
      });

      const detectedVariables: DetectedVariable[] = Array.from(variableCounts.entries()).map(([placeholder, count]) => ({
        placeholder,
        occurrences: count,
        suggestedMapping: this.suggestMapping(placeholder)
      }));

      if (detectedVariables.length > 0) {
        console.log('[DOCX Parser] Detected variables:', detectedVariables.slice(0, 5).map(v => v.placeholder));
      } else {
        console.log('[DOCX Parser] No variables detected - static template');
      }

      return {
        fileBlob: new Blob([arrayBuffer], { type: file.type }),
        detectedVariables
      };
    } catch (error) {
      console.error('[DOCX Parser] Critical error parsing DOCX:', error);
      throw new Error('Failed to read DOCX file. Please ensure it is a valid Word document.');
    }
  }

  /**
   * Suggest system field mapping based on placeholder name
   * Enhanced to handle dot paths like client.name, case.title, etc.
   */
  private suggestMapping(placeholder: string): string | undefined {
    const lowerPlaceholder = placeholder.toLowerCase().replace(/[_\s]/g, '');
    
    // Direct dot path matches (e.g., client.name, case.caseNumber)
    if (placeholder.includes('.')) {
      const availableFields = this.getAvailableSystemFields();
      const exactMatch = availableFields.find(field => 
        field.path.toLowerCase() === placeholder.toLowerCase()
      );
      if (exactMatch) {
        return exactMatch.path;
      }
    }
    
    // Client mappings
    if (lowerPlaceholder.includes('clientname') || lowerPlaceholder === 'client') {
      return 'client.name';
    }
    if (lowerPlaceholder.includes('gstin') || lowerPlaceholder.includes('clientgstin')) {
      return 'client.gstin';
    }
    if (lowerPlaceholder.includes('clientaddress') || lowerPlaceholder.includes('address')) {
      return 'client.address';
    }
    if (lowerPlaceholder.includes('clientemail') || lowerPlaceholder.includes('email')) {
      return 'client.email';
    }
    if (lowerPlaceholder.includes('clientphone') || lowerPlaceholder.includes('phone')) {
      return 'client.phone';
    }

    // Case mappings
    if (lowerPlaceholder.includes('casenumber') || lowerPlaceholder === 'case') {
      return 'case.caseNumber';
    }
    if (lowerPlaceholder.includes('casetitle') || lowerPlaceholder.includes('title')) {
      return 'case.title';
    }
    if (lowerPlaceholder.includes('stage') || lowerPlaceholder.includes('currentstage')) {
      return 'case.currentStage';
    }
    if (lowerPlaceholder.includes('noticetype')) {
      return 'case.noticeType';
    }
    if (lowerPlaceholder.includes('noticenumber')) {
      return 'case.noticeNumber';
    }
    if (lowerPlaceholder.includes('noticedate')) {
      return 'case.noticeDate';
    }
    if (lowerPlaceholder.includes('demand') || lowerPlaceholder.includes('amount')) {
      return 'case.demandAmount';
    }
    if (lowerPlaceholder.includes('taxperiod') || lowerPlaceholder.includes('period')) {
      return 'case.taxPeriod';
    }

    // System mappings
    if (lowerPlaceholder.includes('date') || lowerPlaceholder.includes('today')) {
      return 'system.currentDate';
    }
    if (lowerPlaceholder.includes('year') || lowerPlaceholder.includes('fy')) {
      return 'system.financialYear';
    }

    return undefined;
  }

  /**
   * Generate document from template with data
   * Supports {{ }} delimiters and nested dot paths (e.g., client.name)
   */
  async generateDocument(
    templateBlob: Blob,
    variableMappings: VariableMapping[],
    caseData: Case,
    clientData: Client
  ): Promise<Blob> {
    try {
      const arrayBuffer = await templateBlob.arrayBuffer();
      const zip = new PizZip(arrayBuffer);
      
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: '{{', end: '}}' }
      });

      // Build nested data object from mappings
      // For dot paths like "client.name", create nested structure: { client: { name: value } }
      const data: Record<string, any> = {};
      
      variableMappings.forEach(mapping => {
        const value = this.resolveSystemPath(mapping.systemPath, caseData, clientData);
        const resolvedValue = value || `[${mapping.placeholder}]`;
        
        // Handle dot paths by building nested object
        if (mapping.placeholder.includes('.')) {
          const parts = mapping.placeholder.split('.');
          let current = data;
          
          for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (!current[part]) {
              current[part] = {};
            }
            current = current[part];
          }
          
          current[parts[parts.length - 1]] = resolvedValue;
        } else {
          // Simple placeholder without dots
          data[mapping.placeholder] = resolvedValue;
        }
      });

      console.log('[DOCX Generator] Rendering document with data keys:', Object.keys(data));

      // Render the document
      doc.render(data);

      // Generate output blob
      const output = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      return output;
    } catch (error) {
      console.error('[DOCX Generator] Error generating document:', error);
      throw new Error('Failed to generate document. Please check your template and variable mappings.');
    }
  }

  /**
   * Resolve system path to actual value
   */
  resolveSystemPath(path: string, caseData: Case, clientData: Client): any {
    try {
      // Handle special system values
      if (path === 'system.currentDate') {
        return new Date().toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
      if (path === 'system.financialYear') {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        return month >= 3 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
      }

      // Parse dot notation
      const parts = path.split('.');
      let current: any = { case: caseData, client: clientData };

      for (const part of parts) {
        if (current && typeof current === 'object') {
          current = current[part];
        } else {
          return undefined;
        }
      }

      // Format dates if it's a date field
      if (current instanceof Date) {
        return current.toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }

      // Format numbers with Indian formatting
      if (typeof current === 'number' && path.includes('Amount')) {
        return new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR'
        }).format(current);
      }

      return current;
    } catch (error) {
      console.error(`Error resolving path ${path}:`, error);
      return undefined;
    }
  }

  /**
   * Download generated document
   */
  downloadDocument(blob: Blob, fileName: string): void {
    saveAs(blob, fileName);
  }

  /**
   * Get available system fields for mapping
   */
  getAvailableSystemFields(): Array<{ path: string; label: string; category: string }> {
    return [
      // Client fields
      { path: 'client.name', label: 'Client Name', category: 'Client' },
      { path: 'client.gstin', label: 'Client GSTIN', category: 'Client' },
      { path: 'client.address', label: 'Client Address', category: 'Client' },
      { path: 'client.email', label: 'Client Email', category: 'Client' },
      { path: 'client.phone', label: 'Client Phone', category: 'Client' },
      { path: 'client.pan', label: 'Client PAN', category: 'Client' },
      
      // Case fields
      { path: 'case.caseNumber', label: 'Case Number', category: 'Case' },
      { path: 'case.title', label: 'Case Title', category: 'Case' },
      { path: 'case.currentStage', label: 'Current Stage', category: 'Case' },
      { path: 'case.noticeType', label: 'Notice Type', category: 'Case' },
      { path: 'case.noticeNumber', label: 'Notice Number', category: 'Case' },
      { path: 'case.noticeDate', label: 'Notice Date', category: 'Case' },
      { path: 'case.demandAmount', label: 'Demand Amount', category: 'Case' },
      { path: 'case.taxPeriod', label: 'Tax Period', category: 'Case' },
      { path: 'case.filingDate', label: 'Filing Date', category: 'Case' },
      
      // System fields
      { path: 'system.currentDate', label: 'Current Date', category: 'System' },
      { path: 'system.financialYear', label: 'Financial Year', category: 'System' },
    ];
  }
}

export const docxTemplateService = new DocxTemplateService();

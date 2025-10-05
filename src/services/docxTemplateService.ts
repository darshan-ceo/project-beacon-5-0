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
   */
  async parseDocxTemplate(file: File): Promise<{
    fileBlob: Blob;
    detectedVariables: DetectedVariable[];
  }> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = new PizZip(arrayBuffer);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      // Extract text content to find variables
      const fullText = doc.getFullText();
      
      // Find all {{variable}} placeholders
      const variableRegex = /\{\{([^}]+)\}\}/g;
      const matches = [...fullText.matchAll(variableRegex)];
      
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

      return {
        fileBlob: new Blob([arrayBuffer], { type: file.type }),
        detectedVariables
      };
    } catch (error) {
      console.error('Error parsing DOCX template:', error);
      throw new Error('Failed to parse DOCX file. Please ensure it is a valid Word document.');
    }
  }

  /**
   * Suggest system field mapping based on placeholder name
   */
  private suggestMapping(placeholder: string): string | undefined {
    const lowerPlaceholder = placeholder.toLowerCase().replace(/[_\s]/g, '');
    
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
      });

      // Build data object from mappings
      const data: Record<string, any> = {};
      variableMappings.forEach(mapping => {
        const value = this.resolveSystemPath(mapping.systemPath, caseData, clientData);
        data[mapping.placeholder] = value || `[${mapping.placeholder}]`;
      });

      // Render the document
      doc.render(data);

      // Generate output blob
      const output = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      return output;
    } catch (error) {
      console.error('Error generating document:', error);
      throw new Error('Failed to generate document. Please check your template and variable mappings.');
    }
  }

  /**
   * Resolve system path to actual value
   */
  private resolveSystemPath(path: string, caseData: Case, clientData: Client): any {
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

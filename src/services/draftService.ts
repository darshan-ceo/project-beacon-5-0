import { toast } from '@/hooks/use-toast';
import { dmsService } from './dmsService';
import { reportsService } from './reportsService';
import { AppAction } from '@/contexts/AppStateContext';

export interface DraftSaveOptions {
  caseId: string;
  stageId?: string;
  templateCode: string;
  html: string;
  output: 'pdf' | 'docx';
  version?: number;
}

export interface DraftSaveResult {
  fileId: string;
  url: string;
  version: number;
  fileName: string;
}

export interface TimelineEntry {
  id: string;
  caseId: string;
  type: 'doc_saved' | 'ai_draft_generated';
  title: string;
  description: string;
  createdBy: string;
  createdAt: string;
  metadata: {
    templateCode?: string;
    version?: number;
    fileName?: string;
  };
}

class DraftService {
  /**
   * Standardized save pipeline for AI drafts
   */
  async save(
    options: DraftSaveOptions,
    dispatch: React.Dispatch<AppAction>
  ): Promise<DraftSaveResult> {
    const { caseId, stageId, templateCode, html, output, version = 1 } = options;

    // Validate required context
    if (!caseId || !templateCode || !html.trim()) {
      throw new Error('Missing required context: caseId, templateCode, and content are required');
    }

    console.log(`[DraftSave] Starting save pipeline for ${templateCode} v${version}`);

    try {
      // Step 1: Generate file blob
      let blob: Blob;
      let mimeType: string;
      let extension: string;

      if (output === 'pdf') {
        // Convert HTML to PDF
        blob = await this.generatePDF(html, templateCode);
        mimeType = 'application/pdf';
        extension = 'pdf';
      } else if (output === 'docx') {
        // Convert HTML to DOCX
        blob = await this.generateDOCX(html, templateCode);
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        extension = 'docx';
      } else {
        throw new Error(`Unsupported output format: ${output}`);
      }

      // Step 2: Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `${templateCode}_${caseId}_v${version}_${timestamp}.${extension}`;

      // Step 3: Create File object for upload
      const file = new File([blob], fileName, { type: mimeType });

      console.log(`[DraftSave] Generated ${extension.toUpperCase()} file: ${fileName} (${blob.size} bytes)`);

      // Step 4: Upload to DMS
      const uploadOptions = {
        caseId,
        stageId,
        folderHint: stageId ? "Stage" : "Templates",
        tags: ['ai-generated', templateCode, `v${version}`]
      };

      const uploadResult = await dmsService.files.upload(file, uploadOptions, dispatch);

      if (!uploadResult.success || !uploadResult.document) {
        throw new Error('Failed to upload draft document');
      }

      const document = uploadResult.document;
      console.log(`[DraftSave] Upload successful: ${document.id}`);

      // Step 5: Create timeline entry
      await this.addTimelineEntry(caseId, {
        type: 'doc_saved',
        title: 'AI Draft Saved',
        description: `Document saved from template ${templateCode} (v${version})`,
        metadata: {
          templateCode,
          version,
          fileName
        }
      });

      // Step 6: Return result
      const result: DraftSaveResult = {
        fileId: document.id,
        url: document.path,
        version,
        fileName
      };

      toast({
        title: "Draft Saved Successfully",
        description: `${fileName} has been saved to case documents.`,
      });

      return result;

    } catch (error) {
      console.error(`[DraftSave] Save failed:`, error);
      
      // Enhanced error messages
      let errorMessage = 'Failed to save draft. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('413') || error.message.includes('Payload Too Large')) {
          errorMessage = 'Document too large. Please reduce content size and retry.';
        } else if (error.message.includes('permissions') || error.message.includes('RBAC')) {
          errorMessage = 'You do not have permission to save documents. Contact your administrator.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and retry.';
        }
      }

      toast({
        title: "Save Failed",
        description: errorMessage,
        variant: "destructive"
      });

      throw error;
    }
  }

  /**
   * Generate PDF from HTML content
   */
  private async generatePDF(html: string, templateCode: string): Promise<Blob> {
    console.log(`[DraftSave] Generating PDF for ${templateCode}`);
    
    // Enhanced PDF generation with proper formatting
    const pdfContent = this.createPDFStructure(html, templateCode);
    return new Blob([pdfContent], { type: 'application/pdf' });
  }

  /**
   * Generate DOCX from HTML content
   */
  private async generateDOCX(html: string, templateCode: string): Promise<Blob> {
    console.log(`[DraftSave] Generating DOCX for ${templateCode}`);
    
    // Mock DOCX generation - in production, use a proper library like docx or mammoth
    const docxContent = this.createDOCXStructure(html, templateCode);
    return new Blob([docxContent], { 
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
    });
  }

  /**
   * Create proper PDF structure
   */
  private createPDFStructure(html: string, templateCode: string): string {
    const timestamp = new Date().toLocaleString();
    
    return `%PDF-1.4
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
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length ${this.calculateContentLength(html)}
>>
stream
BT
/F1 16 Tf
72 720 Td
(${templateCode} - AI Generated Draft) Tj
0 -20 Td
/F1 10 Tf
(Generated: ${timestamp}) Tj
0 -40 Td
/F1 12 Tf
${this.convertHTMLToPDFText(html)}
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000079 00000 n 
0000000173 00000 n 
0000000301 00000 n 
0000000456 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
539
%%EOF`;
  }

  /**
   * Create DOCX structure (simplified)
   */
  private createDOCXStructure(html: string, templateCode: string): string {
    const timestamp = new Date().toLocaleString();
    
    // Simplified DOCX-like structure
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="32"/>
        </w:rPr>
        <w:t>${templateCode} - AI Generated Draft</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:rPr>
          <w:sz w:val="20"/>
        </w:rPr>
        <w:t>Generated: ${timestamp}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t></w:t>
      </w:r>
    </w:p>
    ${this.convertHTMLToWordML(html)}
  </w:body>
</w:document>`;
  }

  /**
   * Convert HTML to PDF text commands
   */
  private convertHTMLToPDFText(html: string): string {
    // Remove HTML tags and convert to PDF text commands
    const plainText = html.replace(/<[^>]*>/g, '').replace(/\n\n/g, '\n');
    const lines = plainText.split('\n').filter(line => line.trim());
    
    return lines.map(line => `(${line.substring(0, 80)}) Tj\n0 -15 Td`).join('\n');
  }

  /**
   * Convert HTML to WordML paragraphs
   */
  private convertHTMLToWordML(html: string): string {
    const plainText = html.replace(/<[^>]*>/g, '');
    const paragraphs = plainText.split('\n\n').filter(p => p.trim());
    
    return paragraphs.map(paragraph => `
    <w:p>
      <w:r>
        <w:t>${paragraph.trim()}</w:t>
      </w:r>
    </w:p>`).join('');
  }

  /**
   * Calculate content length for PDF structure
   */
  private calculateContentLength(html: string): number {
    return 200 + html.length; // Base + content length
  }

  /**
   * Add timeline entry for draft save
   */
  private async addTimelineEntry(
    caseId: string, 
    entry: Omit<TimelineEntry, 'id' | 'caseId' | 'createdBy' | 'createdAt'>
  ): Promise<void> {
    const timelineEntry: TimelineEntry = {
      id: `timeline-${Date.now()}`,
      caseId,
      createdBy: 'Current User', // TODO: Get from auth context
      createdAt: new Date().toISOString(),
      ...entry
    };

    console.log(`[DraftSave] Timeline entry created:`, timelineEntry);
    
    // In production, this would call the timeline service
    // await timelineService.addEntry(timelineEntry);
  }

  /**
   * Check RBAC permissions before save
   */
  async checkPermissions(userId: string, action: 'documents.write' | 'templates.generate'): Promise<boolean> {
    // TODO: Integrate with actual RBAC service
    // const { rbacService } = await import('./rbacService');
    // return rbacService.hasPermission(userId, action);
    return true; // Mock - always allow for now
  }

  /**
   * Get next version number for a template/case combination
   */
  async getNextVersion(caseId: string, templateCode: string): Promise<number> {
    // TODO: Query existing files to determine next version
    // In production, this would check DMS for existing files with same template code
    return 1; // Mock - always start with version 1
  }
}

export const draftService = new DraftService();
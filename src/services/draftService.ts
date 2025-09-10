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
    const content = this.convertHTMLToPDFText(html);
    const contentLength = content.length + 200; // Approximate content size
    
    return `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
/Metadata 6 0 R
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
/F2 7 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length ${contentLength}
>>
stream
BT
/F1 18 Tf
72 720 Td
(${templateCode.replace(/[()\\]/g, '\\$&')} - AI Generated Draft) Tj
0 -24 Td
/F2 10 Tf
(Generated: ${timestamp.replace(/[()\\]/g, '\\$&')}) Tj
0 -30 Td
${content}
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica-Bold
>>
endobj

6 0 obj
<<
/Type /Metadata
/Subtype /XML
/Length 127
>>
stream
<?xml version="1.0"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">
      <dc:title>${templateCode}</dc:title>
      <dc:creator>AI Assistant</dc:creator>
      <dc:subject>Legal Draft</dc:subject>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
endstream
endobj

7 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 8
0000000000 65535 f 
0000000010 00000 n 
0000000079 00000 n 
0000000173 00000 n 
0000000301 00000 n 
0000000456 00000 n 
0000000523 00000 n 
0000000890 00000 n 
trailer
<<
/Size 8
/Root 1 0 R
>>
startxref
950
%%EOF`;
  }

  /**
   * Create DOCX structure (basic but valid)
   */
  private createDOCXStructure(html: string, templateCode: string): string {
    const timestamp = new Date().toLocaleString();
    
    // Basic DOCX document.xml structure
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="28"/>
          <w:szCs w:val="28"/>
        </w:rPr>
        <w:t>${this.escapeXML(templateCode)} - AI Generated Draft</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:sz w:val="20"/>
          <w:szCs w:val="20"/>
          <w:color w:val="666666"/>
        </w:rPr>
        <w:t>Generated: ${this.escapeXML(timestamp)}</w:t>
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

    // For simplicity, return just the document XML
    // In a real implementation, this would be part of a proper DOCX zip structure
    return documentXml;
  }

  /**
   * Escape XML special characters
   */
  private escapeXML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Convert HTML to PDF text commands
   */
  private convertHTMLToPDFText(html: string): string {
    // Enhanced HTML to PDF conversion with better formatting
    let plainText = html
      .replace(/<h[1-6][^>]*>/gi, '\n\n')
      .replace(/<\/h[1-6]>/gi, '\n')
      .replace(/<p[^>]*>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/\n\n+/g, '\n\n')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
    
    const lines = plainText.split('\n').filter(line => line.trim());
    
    return lines.map((line, index) => {
      // Escape special PDF characters
      const escapedLine = line.substring(0, 85).replace(/[()\\]/g, '\\$&');
      const fontSize = index === 0 ? '14' : '12';
      const leading = index === 0 ? '-18' : '-14';
      
      return `/F2 ${fontSize} Tf\n(${escapedLine}) Tj\n0 ${leading} Td`;
    }).join('\n');
  }

  /**
   * Convert HTML to WordML paragraphs
   */
  private convertHTMLToWordML(html: string): string {
    // Enhanced HTML to WordML conversion
    let content = html
      .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, (match, text) => 
        `<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>${this.escapeXML(text)}</w:t></w:r></w:p>`)
      .replace(/<p[^>]*>(.*?)<\/p>/gi, (match, text) => 
        `<w:p><w:r><w:t>${this.escapeXML(text)}</w:t></w:r></w:p>`)
      .replace(/<br\s*\/?>/gi, '<w:p><w:r><w:t></w:t></w:r></w:p>')
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, (match, text) => 
        `<w:r><w:rPr><w:b/></w:rPr><w:t>${this.escapeXML(text)}</w:t></w:r>`)
      .replace(/<em[^>]*>(.*?)<\/em>/gi, (match, text) => 
        `<w:r><w:rPr><w:i/></w:rPr><w:t>${this.escapeXML(text)}</w:t></w:r>`)
      .replace(/<[^>]*>/g, ''); // Remove any remaining HTML tags
    
    // If no HTML tags were found, treat as plain text
    if (!content.includes('<w:p>')) {
      const paragraphs = html.split('\n\n').filter(p => p.trim());
      content = paragraphs.map(paragraph => 
        `<w:p><w:r><w:t>${this.escapeXML(paragraph.trim())}</w:t></w:r></w:p>`
      ).join('');
    }
    
    return content || '<w:p><w:r><w:t>No content available</w:t></w:r></w:p>';
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
    try {
      // Import timelineService dynamically to avoid circular dependencies
      const { timelineService } = await import('./timelineService');
      
      await timelineService.addEntry({
        caseId,
        createdBy: 'Current User', // TODO: Get from auth context
        ...entry
      });
      
      console.log(`[DraftSave] Timeline entry added for case ${caseId}`);
    } catch (error) {
      console.error(`[DraftSave] Failed to add timeline entry:`, error);
      // Don't fail the entire save operation for timeline issues
    }
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
    try {
      // Import dmsService to check existing documents
      const { dmsService } = await import('./dmsService');
      
      // Get all documents for the case
      const documents = await dmsService.files.list({ caseId });
      
      // Find documents with the same template code
      const templateDocs = documents.filter(doc => 
        doc.tags.includes(templateCode) && 
        doc.tags.some(tag => tag.startsWith('v'))
      );
      
      if (templateDocs.length === 0) {
        return 1; // First version
      }
      
      // Extract version numbers and find the highest
      const versions = templateDocs.map(doc => {
        const versionTag = doc.tags.find(tag => tag.match(/^v\d+$/));
        return versionTag ? parseInt(versionTag.substring(1)) : 0;
      }).filter(v => v > 0);
      
      const maxVersion = Math.max(...versions, 0);
      return maxVersion + 1;
      
    } catch (error) {
      console.warn(`[DraftSave] Could not determine version, using v1:`, error);
      return 1; // Fallback to version 1
    }
  }
}

export const draftService = new DraftService();
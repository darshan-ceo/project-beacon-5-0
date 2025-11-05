import { supabase } from '@/integrations/supabase/client';

interface SeedDocumentResult {
  success: boolean;
  documentsCreated: number;
  errors: string[];
}

export class DocumentDataSeeder {
  private tenantId: string | null = null;
  private userId: string | null = null;

  async initialize(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id) throw new Error('Tenant ID not found');

    this.tenantId = profile.tenant_id;
    this.userId = user.id;
  }

  private generatePDFContent(title: string, content: string): Blob {
    // Simple PDF-like content (not a real PDF, but suitable for testing)
    const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >>
/MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 100 >>
stream
BT
/F1 12 Tf
50 750 Td
(${title}) Tj
0 -20 Td
(${content}) Tj
ET
endstream
endobj
xref
0 5
trailer
<< /Size 5 /Root 1 0 R >>
startxref
%%EOF`;
    return new Blob([pdfContent], { type: 'application/pdf' });
  }

  private generateDOCXContent(title: string, content: string): Blob {
    // Simple XML content for DOCX (simplified for testing)
    const docxContent = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>${title}</w:t></w:r></w:p>
    <w:p><w:r><w:t>${content}</w:t></w:r></w:p>
  </w:body>
</w:document>`;
    return new Blob([docxContent], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }

  async seedSampleDocuments(): Promise<SeedDocumentResult> {
    const result: SeedDocumentResult = {
      success: true,
      documentsCreated: 0,
      errors: []
    };

    try {
      await this.initialize();

      // Fetch first 3 case IDs for linking
      const { data: cases } = await supabase
        .from('cases')
        .select('id, case_number')
        .eq('tenant_id', this.tenantId!)
        .limit(3);

      if (!cases || cases.length === 0) {
        throw new Error('No cases found. Please create cases before seeding documents.');
      }

      const sampleDocuments = [
        {
          fileName: 'GST_Order_Assessment_12345.pdf',
          title: 'GST Assessment Order #12345',
          type: 'application/pdf',
          category: 'Order',
          caseId: cases[0]?.id,
          content: 'This is a sample GST assessment order document for case ' + cases[0]?.case_number,
          tags: ['gst', 'assessment', 'order']
        },
        {
          fileName: 'ASMT10_Notice_Response.pdf',
          title: 'ASMT-10 Notice Response Document',
          type: 'application/pdf',
          category: 'Notice',
          caseId: cases[1]?.id || cases[0]?.id,
          content: 'Response to ASMT-10 notice with detailed explanations and supporting evidence.',
          tags: ['notice', 'asmt-10', 'response']
        },
        {
          fileName: 'Reply_Submission_Draft_v2.docx',
          title: 'Reply Submission Draft',
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          category: 'Reply',
          caseId: cases[0]?.id,
          content: 'Draft reply submission to tax authorities with legal arguments and precedents.',
          tags: ['reply', 'draft', 'submission']
        },
        {
          fileName: 'Hearing_Notes_Jan2025.docx',
          title: 'Hearing Notes - January 2025',
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          category: 'Hearing Notes',
          caseId: cases[2]?.id || cases[0]?.id,
          content: 'Detailed notes from hearing session including questions asked and responses provided.',
          tags: ['hearing', 'notes', 'january']
        },
        {
          fileName: 'Evidence_Documents_Compilation.pdf',
          title: 'Evidence Documents Compilation',
          type: 'application/pdf',
          category: 'Evidence',
          caseId: cases[1]?.id || cases[0]?.id,
          content: 'Compiled evidence documents including invoices, purchase orders, and transport records.',
          tags: ['evidence', 'invoices', 'compilation']
        }
      ];

      for (const doc of sampleDocuments) {
        try {
          // Generate file content
          const fileBlob = doc.type === 'application/pdf' 
            ? this.generatePDFContent(doc.title, doc.content)
            : this.generateDOCXContent(doc.title, doc.content);

          // Upload to Supabase Storage
          const filePath = `${this.tenantId}/${doc.caseId}/${doc.fileName}`;
          const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(filePath, fileBlob, {
              contentType: doc.type,
              upsert: true
            });

          if (uploadError) {
            result.errors.push(`Upload failed for ${doc.fileName}: ${uploadError.message}`);
            continue;
          }

          // Get public/signed URL
          const { data: urlData } = supabase.storage
            .from('documents')
            .getPublicUrl(filePath);

          // Insert document metadata into database
          const { error: dbError } = await supabase
            .from('documents')
            .insert({
              tenant_id: this.tenantId,
              case_id: doc.caseId,
              file_name: doc.fileName,
              file_path: filePath,
              file_type: doc.type,
              file_size: fileBlob.size,
              storage_url: urlData.publicUrl,
              category: doc.category,
              uploaded_by: this.userId!,
              version: 1,
              is_latest_version: true
            });

          if (dbError) {
            result.errors.push(`Database insert failed for ${doc.fileName}: ${dbError.message}`);
            continue;
          }

          result.documentsCreated++;
          console.log(`✅ Seeded document: ${doc.fileName}`);
        } catch (error) {
          result.errors.push(`Error processing ${doc.fileName}: ${error}`);
        }
      }

      if (result.errors.length > 0) {
        result.success = false;
      }

      console.log(`📄 Document Seeding Complete: ${result.documentsCreated}/${sampleDocuments.length} documents created`);
      return result;

    } catch (error) {
      result.success = false;
      result.errors.push(`Fatal error: ${error}`);
      return result;
    }
  }
}

export const documentDataSeeder = new DocumentDataSeeder();

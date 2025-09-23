import { BaseRepository } from './BaseRepository';
import { Document, Attachment } from '@/data/db';
import type { StoragePort } from '@/data/ports/StoragePort';
import type { AuditService } from '@/data/services/AuditService';

export interface DocumentWithAttachments extends Document {
  attachments: Attachment[];
}

export interface CreateDocumentData {
  name: string;
  file_type: string;
  size: number;
  case_id: string;
  client_id: string;
  uploaded_by_id: string;
  uploaded_by_name: string;
  content?: string;
  folder_id?: string;
  is_shared?: boolean;
  path?: string;
  attachments?: Omit<Attachment, 'id' | 'document_id' | 'created_at' | 'updated_at'>[];
}

export class DocumentRepository extends BaseRepository<Document> {
  constructor(storage: StoragePort, auditService?: AuditService) {
    super(storage, 'documents', auditService);
  }

  async createWithAttachments(data: CreateDocumentData): Promise<DocumentWithAttachments> {
    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const document: Document = {
      id: documentId,
      name: data.name,
      mime: data.file_type,
      size: data.size,
      case_id: data.case_id,
      client_id: data.client_id,
      uploaded_by_id: data.uploaded_by_id,
      uploaded_by_name: data.uploaded_by_name,
      uploaded_at: new Date(),
      created_at: new Date(),
      added_on: new Date(),
      version: 1,
      status: 'active',
      content: data.content,
      folder_id: data.folder_id,
      is_shared: data.is_shared || false,
      path: data.path || `/documents/${documentId}`
    };

    // Create attachments if provided
    const attachments: Attachment[] = [];
    if (data.attachments) {
      for (const attachmentData of data.attachments) {
        const attachment: Attachment = {
          id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          document_id: documentId,
          filename: attachmentData.filename,
          mime: attachmentData.mime,
          size: attachmentData.size,
          content: attachmentData.content,
          owner_type: 'document',
          created_at: new Date(),
          updated_at: new Date()
        };
        attachments.push(attachment);
      }
    }

    // Create document and attachments in transaction
    return await this.withTransaction(async () => {
      const createdDocument = await this.create(document);
      
      // Create attachments
      if (attachments.length > 0) {
        await this.storage.bulkCreate('attachments', attachments);
      }

      return {
        ...createdDocument,
        attachments
      };
    });
  }

  async getWithAttachments(id: string): Promise<DocumentWithAttachments | null> {
    const document = await this.getById(id);
    if (!document) return null;

    const attachments = await this.storage.queryByField<Attachment>('attachments', 'document_id', id);
    
    return {
      ...document,
      attachments
    };
  }

  async getAllWithAttachments(): Promise<DocumentWithAttachments[]> {
    const documents = await this.getAll();
    const allAttachments = await this.storage.getAll<Attachment>('attachments');
    
    return documents.map(doc => ({
      ...doc,
      attachments: allAttachments.filter(att => att.document_id === doc.id)
    }));
  }

  async updateWithAttachments(
    id: string, 
    updates: Partial<CreateDocumentData>
  ): Promise<DocumentWithAttachments> {
    return await this.withTransaction(async () => {
      // Update document
      const updatedDocument = await this.update(id, {
        ...updates,
        updated_at: new Date()
      } as Partial<Document>);

      // Handle attachment updates if provided
      let attachments: Attachment[] = [];
      if (updates.attachments) {
        // Remove existing attachments
        const existingAttachments = await this.storage.queryByField<Attachment>('attachments', 'document_id', id);
        if (existingAttachments.length > 0) {
          await this.storage.bulkDelete('attachments', existingAttachments.map(att => att.id));
        }

        // Create new attachments
        const newAttachments: Attachment[] = updates.attachments.map(attachmentData => ({
          id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          document_id: id,
          filename: attachmentData.filename,
          mime: attachmentData.mime,
          size: attachmentData.size,
          content: attachmentData.content,
          owner_type: 'document',
          created_at: new Date(),
          updated_at: new Date()
        }));

        if (newAttachments.length > 0) {
          await this.storage.bulkCreate('attachments', newAttachments);
        }
        attachments = newAttachments;
      } else {
        // Keep existing attachments
        attachments = await this.storage.queryByField<Attachment>('attachments', 'document_id', id);
      }

      return {
        ...updatedDocument,
        attachments
      };
    });
  }

  async delete(id: string): Promise<void> {
    return await this.withTransaction(async () => {
      // Delete all attachments first
      const attachments = await this.storage.queryByField<Attachment>('attachments', 'document_id', id);
      if (attachments.length > 0) {
        await this.storage.bulkDelete('attachments', attachments.map(att => att.id));
      }

      // Delete the document
      await super.delete(id);
    });
  }

  async getByFolder(folderId: string): Promise<DocumentWithAttachments[]> {
    const documents = await this.storage.queryByField<Document>('documents', 'folder_id', folderId);
    const allAttachments = await this.storage.getAll<Attachment>('attachments');
    
    return documents.map(doc => ({
      ...doc,
      attachments: allAttachments.filter(att => att.document_id === doc.id)
    }));
  }

  async getByCase(caseId: string): Promise<DocumentWithAttachments[]> {
    const documents = await this.storage.queryByField<Document>('documents', 'case_id', caseId);
    const allAttachments = await this.storage.getAll<Attachment>('attachments');
    
    return documents.map(doc => ({
      ...doc,
      attachments: allAttachments.filter(att => att.document_id === doc.id)
    }));
  }

  async search(query: string): Promise<DocumentWithAttachments[]> {
    const searchLower = query.toLowerCase();
    const documents = await this.storage.query<Document>('documents', (doc) => 
      doc.name.toLowerCase().includes(searchLower) ||
      doc.case_id.toLowerCase().includes(searchLower)
    );
    const allAttachments = await this.storage.getAll<Attachment>('attachments');
    
    return documents.map(doc => ({
      ...doc,
      attachments: allAttachments.filter(att => att.document_id === doc.id)
    }));
  }

  // Helper method to create blob URLs for preview
  createPreviewUrl(document: Document): string {
    if (!document.content) {
      throw new Error('Document has no content for preview');
    }

    try {
      // Decode base64 content
      const binaryString = atob(document.content);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Create blob with appropriate MIME type
      const mimeType = this.getMimeType(document.mime || '');
      const blob = new Blob([bytes], { type: mimeType });
      
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Failed to create preview URL:', error);
      throw new Error('Invalid document content');
    }
  }

  // Helper method to trigger download
  downloadDocument(document: Document, previewUrl?: string): void {
    const url = previewUrl || this.createPreviewUrl(document);
    
    const link = window.document.createElement('a');
    link.href = url;
    link.download = document.name;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
    
    // Clean up blob URL if we created it
    if (!previewUrl) {
      URL.revokeObjectURL(url);
    }
  }

  private getMimeType(fileType: string): string {
    const mimeTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'txt': 'text/plain',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp'
    };
    
    return mimeTypes[fileType.toLowerCase()] || 'application/octet-stream';
  }
}

/**
 * Document Service - DEMO mode implementation with write-through pattern
 */

import { unifiedStore } from '@/persistence/unifiedStore';
import type { Document } from '@/contexts/AppStateContext';
import type { 
  DocumentService, 
  CreateDocumentData, 
  UpdateDocumentData, 
  ApiResponse 
} from '@/mock/apiContracts';
import { demoConfig } from '@/config/demoConfig';

class DocumentServiceImpl implements DocumentService {
  async create(data: CreateDocumentData): Promise<ApiResponse<Document>> {
    try {
      demoConfig.assertDemoMode();
      await demoConfig.simulateDelay();
      
      // Auto-populate derived fields
      const caseData = await unifiedStore.cases.getById(data.caseId);
      if (!caseData) {
        throw new Error('Case not found');
      }

      const newDocument: Document = {
        id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...data,
        clientId: caseData.clientId,
        uploadedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      await unifiedStore.documents.create(newDocument);

      return {
        success: true,
        data: newDocument,
        message: 'Document created successfully'
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Create Document');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async update(id: string, data: UpdateDocumentData): Promise<ApiResponse<Document>> {
    try {
      demoConfig.assertDemoMode();
      await demoConfig.simulateDelay();

      const updatedDocument = await unifiedStore.documents.update(id, data);

      return {
        success: true,
        data: updatedDocument,
        message: 'Document updated successfully'
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Update Document');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      demoConfig.assertDemoMode();
      await demoConfig.simulateDelay();

      await unifiedStore.documents.delete(id);

      return {
        success: true,
        message: 'Document deleted successfully'
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Delete Document');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async getById(id: string): Promise<ApiResponse<Document>> {
    try {
      demoConfig.assertDemoMode();
      await demoConfig.simulateDelay();

      const document = await unifiedStore.documents.getById(id);
      if (!document) {
        return {
          success: false,
          error: 'Document not found'
        };
      }

      return {
        success: true,
        data: document
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Get Document');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async getAll(): Promise<ApiResponse<Document[]>> {
    try {
      demoConfig.assertDemoMode();
      await demoConfig.simulateDelay();

      const documents = await unifiedStore.documents.getAll();

      return {
        success: true,
        data: documents
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Get All Documents');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async getByCase(caseId: string): Promise<ApiResponse<Document[]>> {
    try {
      demoConfig.assertDemoMode();
      await demoConfig.simulateDelay();

      const documents = await unifiedStore.documents.query((doc) => doc.caseId === caseId);

      return {
        success: true,
        data: documents
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Get Documents by Case');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async getByFolder(folderId: string): Promise<ApiResponse<Document[]>> {
    try {
      demoConfig.assertDemoMode();
      await demoConfig.simulateDelay();

      const documents = await unifiedStore.documents.query((doc) => doc.folderId === folderId);

      return {
        success: true,
        data: documents
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Get Documents by Folder');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async bulkUpload(documents: CreateDocumentData[]): Promise<ApiResponse<Document[]>> {
    try {
      demoConfig.assertDemoMode();
      await demoConfig.simulateDelay();

      const createdDocuments: Document[] = [];

      for (const docData of documents) {
        // Auto-populate derived fields
        const caseData = await unifiedStore.cases.getById(docData.caseId);
        if (!caseData) {
          console.warn(`Case ${docData.caseId} not found for document ${docData.name}`);
          continue;
        }

        const newDocument: Document = {
          id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ...docData,
          clientId: caseData.clientId,
          uploadedAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        };

        createdDocuments.push(newDocument);
      }

      // Bulk create in unifiedStore
      const results = await unifiedStore.bulkCreate('documents', createdDocuments);

      return {
        success: true,
        data: results,
        message: `${results.length} documents uploaded successfully`
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Bulk Upload Documents');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  // Document preview utilities for DEMO mode
  async getPreviewUrl(id: string): Promise<string | null> {
    try {
      const document = await unifiedStore.documents.getById(id);
      if (!document || !document.content) {
        return null;
      }

      // Create blob URL from base64 content
      const byteCharacters = atob(document.content);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: this.getMimeType(document.type) });
      
      return URL.createObjectURL(blob);
    } catch (error) {
      console.warn('Failed to create preview URL:', error);
      return null;
    }
  }

  revokePreviewUrl(url: string): void {
    try {
      URL.revokeObjectURL(url);
    } catch (error) {
      console.warn('Failed to revoke preview URL:', error);
    }
  }

  private getMimeType(fileType: string): string {
    const mimeTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'txt': 'text/plain'
    };

    return mimeTypes[fileType.toLowerCase()] || 'application/octet-stream';
  }
}

export const documentService = new DocumentServiceImpl();
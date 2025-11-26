import { dmsService } from './dmsService';
import { toast } from '@/hooks/use-toast';
import { AppAction } from '@/contexts/AppStateContext';
import { loadAppState } from '@/data/storageShim';

export type EmployeeDocumentCategory = 
  | 'resume' 
  | 'idProof' 
  | 'addressProof' 
  | 'barOrIcaiCert' 
  | 'nda' 
  | 'offerLetter';

interface UploadConfig {
  maxSize: number; // in MB
  acceptedTypes: string[];
  label: string;
}

const UPLOAD_CONFIGS: Record<EmployeeDocumentCategory, UploadConfig> = {
  resume: {
    maxSize: 10,
    acceptedTypes: ['.pdf', '.doc', '.docx'],
    label: 'Resume / CV'
  },
  idProof: {
    maxSize: 10,
    acceptedTypes: ['.pdf', '.jpg', '.jpeg', '.png'],
    label: 'ID Proof (PAN/Aadhaar)'
  },
  addressProof: {
    maxSize: 10,
    acceptedTypes: ['.pdf', '.jpg', '.jpeg', '.png'],
    label: 'Address Proof'
  },
  barOrIcaiCert: {
    maxSize: 10,
    acceptedTypes: ['.pdf', '.jpg', '.jpeg', '.png'],
    label: 'Bar Council / ICAI Certificate'
  },
  nda: {
    maxSize: 10,
    acceptedTypes: ['.pdf'],
    label: 'NDA / Confidentiality'
  },
  offerLetter: {
    maxSize: 10,
    acceptedTypes: ['.pdf'],
    label: 'Offer Letter'
  }
};

export const employeeDocumentService = {
  /**
   * Get upload configuration for a document category
   */
  getUploadConfig: (category: EmployeeDocumentCategory): UploadConfig => {
    return UPLOAD_CONFIGS[category];
  },

  /**
   * Validate file before upload
   */
  validateFile: (file: File, category: EmployeeDocumentCategory): { valid: boolean; error?: string } => {
    const config = UPLOAD_CONFIGS[category];
    
    // Check file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > config.maxSize) {
      return {
        valid: false,
        error: `File size exceeds ${config.maxSize}MB limit`
      };
    }

    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!config.acceptedTypes.includes(fileExtension)) {
      return {
        valid: false,
        error: `Invalid file type. Accepted: ${config.acceptedTypes.join(', ')}`
      };
    }

    return { valid: true };
  },

  /**
   * Upload employee document to DMS
   */
  uploadDocument: async (
    employeeCode: string,
    category: EmployeeDocumentCategory,
    file: File,
    dispatch: React.Dispatch<AppAction>
  ): Promise<string> => {
    if (!employeeCode) {
      throw new Error('Employee code is required to upload documents');
    }

    // Validate file
    const validation = employeeDocumentService.validateFile(file, category);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    try {
      // Ensure Employees folder exists
      const folders = await dmsService.folders.listAll();
      let employeesFolder = folders.find(f => f.id === 'employees');
      
      if (!employeesFolder) {
        employeesFolder = await dmsService.folders.create('Employees', undefined, undefined, dispatch);
      }

      // Create employee-specific subfolder if needed
      const employeeFolderPath = `/folders/employees/${employeeCode.toLowerCase()}`;
      let employeeFolder = folders.find(f => f.path === employeeFolderPath);
      
      if (!employeeFolder) {
        employeeFolder = await dmsService.folders.create(
          employeeCode,
          'employees',
          undefined,
          dispatch
        );
      }

      // Upload document using DMS service (files.upload expects userId as first param)
      const uploadResult = await dmsService.files.upload(
        'system', // Use system as userId for employee document uploads
        file,
        {
          folderId: employeeFolder.id,
          tags: ['employee-document', category]
        },
        dispatch
      );

      if (!uploadResult.success || !uploadResult.document) {
        throw new Error('Upload failed');
      }

      toast({
        title: 'Document uploaded',
        description: `${UPLOAD_CONFIGS[category].label} uploaded successfully`
      });

      return uploadResult.document.id;
    } catch (error) {
      console.error('Document upload failed:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload document',
        variant: 'destructive'
      });
      throw error;
    }
  },

  /**
   * Delete employee document
   */
  deleteDocument: async (
    documentId: string,
    category: EmployeeDocumentCategory,
    dispatch: React.Dispatch<AppAction>
  ): Promise<void> => {
    try {
      await dmsService.deleteDocument(documentId, dispatch);
      
      toast({
        title: 'Document deleted',
        description: `${UPLOAD_CONFIGS[category].label} deleted successfully`
      });
    } catch (error) {
      console.error('Document deletion failed:', error);
      toast({
        title: 'Deletion failed',
        description: error instanceof Error ? error.message : 'Failed to delete document',
        variant: 'destructive'
      });
      throw error;
    }
  },

  /**
   * Get document by ID from app state
   */
  getDocument: async (documentId: string) => {
    try {
      // Get documents from app state
      const appData = await loadAppState();
      let documents: any[] = appData.documents || [];
      
      if (!documents || documents.length === 0) {
        try {
          const idbDocs = await idbStorage.get('documents');
          documents = Array.isArray(idbDocs) ? idbDocs : [];
        } catch {}
      }
      
      return documents.find((doc: any) => doc.id === documentId) || null;
    } catch (error) {
      console.error('Failed to get document:', error);
      return null;
    }
  },

  /**
   * Download employee document
   */
  downloadDocument: async (documentId: string): Promise<void> => {
    try {
      const document = await employeeDocumentService.getDocument(documentId);
      if (!document) {
        throw new Error('Document not found');
      }

      await dmsService.files.download(documentId, document.name);
    } catch (error) {
      console.error('Document download failed:', error);
      toast({
        title: 'Download failed',
        description: error instanceof Error ? error.message : 'Failed to download document',
        variant: 'destructive'
      });
    }
  }
};

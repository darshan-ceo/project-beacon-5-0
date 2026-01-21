import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { AppAction } from '@/contexts/AppStateContext';

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

// Resilient auth helper - uses cached session first
const getAuthenticatedUser = async () => {
  // First try cached session (no network request)
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    return session.user;
  }
  
  // Fall back to getUser (makes network request)
  const { data: { user } } = await supabase.auth.getUser();
  return user;
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
   * Upload employee document directly to Supabase Storage
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
      // Get authenticated user with resilient helper
      const user = await getAuthenticatedUser();
      if (!user) {
        throw new Error('Please log in again to upload documents');
      }

      // Get tenant_id from profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.tenant_id) {
        throw new Error('User profile not found');
      }

      const tenantId = profile.tenant_id;

      // Create unique file path: tenant/employees/employeeCode/category/timestamp-filename
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${tenantId}/employees/${employeeCode.toLowerCase()}/${category}/${timestamp}-${sanitizedFileName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      // Get file extension for file_type
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'unknown';

      // Create document record in database
      const { data: docRecord, error: docError } = await supabase
        .from('documents')
        .insert({
          tenant_id: tenantId,
          file_name: file.name,
          file_path: filePath,
          file_type: fileExtension,
          file_size: file.size,
          uploaded_by: user.id,
          folder_id: 'employees',
          category: `employee-${category}`,
          remarks: `Employee document: ${UPLOAD_CONFIGS[category].label} for ${employeeCode}`
        })
        .select()
        .single();

      if (docError) {
        // Rollback: delete the uploaded file if DB insert fails
        console.error('Document record creation failed:', docError);
        await supabase.storage.from('documents').remove([filePath]);
        throw new Error(`Failed to save document record: ${docError.message}`);
      }

      // Update app state
      if (dispatch) {
        dispatch({
          type: 'ADD_DOCUMENT',
          payload: {
            id: docRecord.id,
            name: file.name,
            type: fileExtension,
            size: file.size,
            path: filePath,
            uploadedAt: docRecord.upload_timestamp || new Date().toISOString(),
            folderId: 'employees',
            tags: ['employee-document', category],
            isShared: false,
            caseId: '',
            clientId: '',
            uploadedById: user.id,
            uploadedByName: ''
          }
        });
      }

      toast({
        title: 'Document uploaded',
        description: `${UPLOAD_CONFIGS[category].label} uploaded successfully`
      });

      return docRecord.id;
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
      // Get the document to find the file path
      const { data: doc, error: fetchError } = await supabase
        .from('documents')
        .select('file_path')
        .eq('id', documentId)
        .single();

      if (fetchError) {
        throw new Error('Document not found');
      }

      // Delete from storage
      if (doc?.file_path) {
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove([doc.file_path]);
        
        if (storageError) {
          console.warn('Storage deletion warning:', storageError);
        }
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (dbError) {
        throw new Error(`Failed to delete document record: ${dbError.message}`);
      }

      // Update app state
      if (dispatch) {
        dispatch({ type: 'DELETE_DOCUMENT', payload: documentId });
      }

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
   * Get document by ID from database
   */
  getDocument: async (documentId: string) => {
    try {
      const { data: doc, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (error) {
        console.error('Failed to get document:', error);
        return null;
      }

      return doc;
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

      // Get signed URL for download
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('documents')
        .createSignedUrl(document.file_path, 3600); // 1 hour expiry

      if (signedUrlError || !signedUrlData?.signedUrl) {
        throw new Error('Failed to generate download link');
      }

      // Trigger download
      const link = window.document.createElement('a');
      link.href = signedUrlData.signedUrl;
      link.download = document.file_name;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);

      toast({
        title: 'Download started',
        description: `Downloading ${document.file_name}`
      });
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

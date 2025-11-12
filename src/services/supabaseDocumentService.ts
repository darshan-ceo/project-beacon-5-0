/**
 * Supabase Document Service
 * Handles document uploads to Supabase Storage and database records
 * Replaces localStorage/IndexedDB document storage
 */

import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { isValidUUID } from '@/utils/uuidValidator';

export interface DocumentMetadata {
  case_id?: string;
  client_id?: string;
  hearing_id?: string;
  task_id?: string;
  folder_id?: string;
  category?: string;
  role?: string;
  remarks?: string;
  tenant_id: string;
}

export interface UploadDocumentResult {
  id: string;
  file_name: string;
  file_path: string;
  storage_url: string;
  file_size: number;
  file_type: string;
  mime_type: string;
}

/**
 * Upload document to Supabase Storage and create database record
 */
export const uploadDocument = async (
  file: File,
  metadata: DocumentMetadata
): Promise<UploadDocumentResult> => {
  try {
    // Validate tenant_id
    if (!metadata.tenant_id || !isValidUUID(metadata.tenant_id)) {
      throw new Error('Valid tenant_id is required for document upload');
    }

    console.log('🔍 [SupabaseDocumentService] Received metadata:', {
      case_id: metadata.case_id,
      client_id: metadata.client_id,
      hearing_id: metadata.hearing_id,
      task_id: metadata.task_id,
      folder_id: metadata.folder_id,
      hasLink: !!(
        metadata.case_id || 
        metadata.client_id || 
        metadata.hearing_id || 
        metadata.task_id || 
        metadata.folder_id
      )
    });

    // Validate at least one entity link is provided
    const hasLink = !!(
      metadata.case_id || 
      metadata.client_id || 
      metadata.hearing_id || 
      metadata.task_id || 
      metadata.folder_id
    );

    if (!hasLink) {
      console.error('❌ [SupabaseDocumentService] Validation failed: No entity link provided', {
        metadata
      });
      throw new Error('Please link this document to a Case, Client, or Folder before uploading.');
    }

    console.log('✅ [SupabaseDocumentService] Validation passed, proceeding with upload');

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated to upload documents');
    }

    // Preflight: check user has a role to pass RLS on documents table
    const { data: userRoles, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (roleError || !userRoles || userRoles.length === 0) {
      throw new Error('Your account lacks a role. Please ask an admin to grant you a role before uploading documents.');
    }

    const allowedRoles = ['admin', 'partner', 'manager', 'ca', 'advocate', 'staff', 'user', 'clerk'];
    const hasAllowedRole = userRoles.some(r => allowedRoles.includes(r.role));
    
    if (!hasAllowedRole) {
      throw new Error(`You need one of the following roles to upload documents: ${allowedRoles.join(', ')}`);
    }

    // Generate unique file path
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const fileName = file.name;
    const uniqueId = uuidv4();
    const filePath = `${metadata.tenant_id}/${uniqueId}.${fileExt}`;

    console.log('📤 Uploading document to Supabase Storage:', {
      fileName,
      filePath,
      size: file.size,
      type: file.type
    });

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Storage upload failed:', uploadError);
      throw new Error(`Failed to upload file: ${uploadError.message}`);
    }

    console.log('✅ File uploaded to storage:', uploadData.path);

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);

    // Create database record
    const documentRecord = {
      id: uniqueId,
      tenant_id: metadata.tenant_id,
      file_name: fileName,
      file_path: filePath,
      file_type: fileExt,
      mime_type: file.type || 'application/octet-stream',
      file_size: file.size,
      storage_url: publicUrl,
      case_id: metadata.case_id || null,
      client_id: metadata.client_id || null,
      hearing_id: metadata.hearing_id || null,
      task_id: metadata.task_id || null,
      folder_id: metadata.folder_id || null,
      category: metadata.category || null,
      role: metadata.role || null,
      remarks: metadata.remarks || null,
      uploaded_by: user.id,
      document_status: 'Pending',
      version: 1,
      is_latest_version: true
    };

    console.log('💾 Creating database record:', { id: uniqueId, fileName });

    const { data: docData, error: dbError } = await supabase
      .from('documents')
      .insert(documentRecord)
      .select()
      .single();

    if (dbError) {
      console.error('❌ [SupabaseDocumentService] Database insert error:', dbError);
      
      // Rollback: Delete the uploaded file from storage
      await supabase.storage
        .from('documents')
        .remove([filePath]);
      
      // Check for specific constraint violations
      if (dbError.code === '23514') {
        // Check constraint violation - determine which constraint
        if (dbError.message?.includes('documents_at_least_one_link') || 
            dbError.message?.includes('at_least_one_link')) {
          throw new Error('Please link this document to a Case, Client, or Folder before uploading.');
        }
        if (dbError.message?.includes('documents_category_check') || 
            dbError.message?.includes('category_check')) {
          throw new Error('Invalid category. Allowed: Notice, Reply, Adjournment, Order, Submission, Miscellaneous.');
        }
        // Generic check constraint error fallback
        throw new Error(`Database constraint violation: ${dbError.message}`);
      }
      
      // Check for folder foreign key violation
      if (dbError.message?.includes('documents_folder_id_fkey') || 
          (dbError.code === '23503' && dbError.message?.includes('folder_id'))) {
        throw new Error('Selected folder does not exist. Please re-select a folder from the list.');
      }
      
      // Check for case foreign key violation
      if (dbError.message?.includes('documents_case_id_fkey') || 
          (dbError.code === '23503' && dbError.message?.includes('case_id'))) {
        throw new Error('Selected case does not exist. Please re-select a case from the list.');
      }
      
      // Check for client foreign key violation
      if (dbError.message?.includes('documents_client_id_fkey') || 
          (dbError.code === '23503' && dbError.message?.includes('client_id'))) {
        throw new Error('Selected client does not exist. Please re-select a client from the list.');
      }
      
      throw new Error(`Failed to save document metadata: ${dbError.message}`);
    }

    console.log('✅ Document uploaded successfully:', docData.id);

    // Create timeline entry for document upload
    try {
      const { timelineService } = await import('./timelineService');
      
      if (metadata.case_id) {
        await timelineService.addEntry({
          caseId: metadata.case_id,
          type: 'doc_saved',
          title: 'Document Uploaded',
          description: `${fileName} uploaded${metadata.category ? ` (${metadata.category})` : ''}`,
          createdBy: 'System', // Will be converted to actual user UUID in timelineService
          metadata: {
            fileName: fileName,
            fileSize: file.size,
            fileType: fileExt,
            folderId: metadata.folder_id,
            category: metadata.category
          }
        });
        console.log('✅ Timeline entry created for document upload');
      }
    } catch (timelineError) {
      console.error('⚠️ Failed to create timeline entry (non-critical):', timelineError);
      // Don't fail the upload if timeline creation fails
    }

    return {
      id: docData.id,
      file_name: docData.file_name,
      file_path: docData.file_path,
      storage_url: docData.storage_url,
      file_size: docData.file_size,
      file_type: docData.file_type,
      mime_type: docData.mime_type
    };

  } catch (error: any) {
    console.error('❌ Document upload failed:', error);
    throw error;
  }
};

/**
 * Get document by ID
 */
export const getDocument = async (id: string) => {
  if (!isValidUUID(id)) {
    throw new Error(`Invalid document ID: ${id}`);
  }

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(`Failed to fetch document: ${error.message}`);
  }

  return data;
};

/**
 * List documents with filters
 */
export const listDocuments = async (filter?: {
  case_id?: string;
  client_id?: string;
  folder_id?: string;
  category?: string;
}) => {
  let query = supabase.from('documents').select('*');

  if (filter?.case_id) query = query.eq('case_id', filter.case_id);
  if (filter?.client_id) query = query.eq('client_id', filter.client_id);
  if (filter?.folder_id) query = query.eq('folder_id', filter.folder_id);
  if (filter?.category) query = query.eq('category', filter.category);

  const { data, error } = await query.order('upload_timestamp', { ascending: false });

  if (error) {
    throw new Error(`Failed to list documents: ${error.message}`);
  }

  return data || [];
};

/**
 * Delete document (both storage and database record)
 */
export const deleteDocument = async (id: string) => {
  if (!isValidUUID(id)) {
    throw new Error(`Invalid document ID: ${id}`);
  }

  // Get document to find file path
  const document = await getDocument(id);

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('documents')
    .remove([document.file_path]);

  if (storageError) {
    console.warn('⚠️ Failed to delete file from storage:', storageError);
  }

  // Delete database record
  const { error: dbError } = await supabase
    .from('documents')
    .delete()
    .eq('id', id);

  if (dbError) {
    throw new Error(`Failed to delete document record: ${dbError.message}`);
  }

  console.log('✅ Document deleted:', id);
};

/**
 * Get signed download URL for a document
 */
export const getDownloadUrl = async (filePath: string, expiresIn: number = 3600) => {
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(filePath, expiresIn);

  if (error) {
    throw new Error(`Failed to generate download URL: ${error.message}`);
  }

  return data.signedUrl;
};

export interface BulkUploadProgress {
  total: number;
  completed: number;
  results: Array<{
    filename: string;
    success: boolean;
    document?: UploadDocumentResult;
    error?: string;
  }>;
}

/**
 * Upload multiple documents in parallel with progress tracking
 */
export const uploadDocumentsBulk = async (
  filesWithMetadata: Array<{ file: File; metadata: DocumentMetadata }>,
  onProgress?: (progress: BulkUploadProgress) => void
): Promise<Array<{ filename: string; success: boolean; document?: UploadDocumentResult; error?: string }>> => {
  const results: Array<{ filename: string; success: boolean; document?: UploadDocumentResult; error?: string }> = [];
  const maxConcurrent = 3; // Upload max 3 files at a time
  let completed = 0;

  const uploadWithRetry = async (
    file: File,
    metadata: DocumentMetadata,
    retries = 2
  ): Promise<{ filename: string; success: boolean; document?: UploadDocumentResult; error?: string }> => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const document = await uploadDocument(file, metadata);
        return { filename: file.name, success: true, document };
      } catch (error: any) {
        if (attempt === retries) {
          return {
            filename: file.name,
            success: false,
            error: error.message || 'Upload failed',
          };
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
    return { filename: file.name, success: false, error: 'Max retries exceeded' };
  };

  // Process uploads in batches
  for (let i = 0; i < filesWithMetadata.length; i += maxConcurrent) {
    const batch = filesWithMetadata.slice(i, i + maxConcurrent);
    const batchResults = await Promise.all(
      batch.map(({ file, metadata }) => uploadWithRetry(file, metadata))
    );

    results.push(...batchResults);
    completed += batchResults.length;

    // Report progress
    if (onProgress) {
      onProgress({
        total: filesWithMetadata.length,
        completed,
        results: [...results],
      });
    }
  }

  return results;
};

export const supabaseDocumentService = {
  uploadDocument,
  getDocument,
  listDocuments,
  deleteDocument,
  getDownloadUrl,
  uploadDocumentsBulk,
};

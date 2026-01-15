/**
 * Order Document Upload Service
 * Handles upload/retrieval of order documents for remand transitions
 */

import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export interface OrderDocumentResult {
  id: string;
  name: string;
  path: string;
  size: number;
  type: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const orderDocumentService = {
  /**
   * Validate file before upload
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: 'File size exceeds 10MB limit' };
    }
    
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Only PDF and Word documents are allowed' };
    }
    
    return { valid: true };
  },

  /**
   * Upload order document to storage
   */
  async uploadOrderDocument(
    file: File,
    caseId: string,
    tenantId: string
  ): Promise<OrderDocumentResult> {
    // Validate first
    const validation = this.validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const fileId = uuidv4();
    const fileExt = file.name.split('.').pop();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${tenantId}/${caseId}/orders/${fileId}_${sanitizedName}`;

    const { error: uploadError } = await supabase.storage
      .from('transition-attachments')
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error('Failed to upload document');
    }

    return {
      id: fileId,
      name: file.name,
      path: storagePath,
      size: file.size,
      type: file.type
    };
  },

  /**
   * Get signed URL for viewing document
   */
  async getSignedUrl(documentPath: string, expiresIn = 3600): Promise<string> {
    const { data, error } = await supabase.storage
      .from('transition-attachments')
      .createSignedUrl(documentPath, expiresIn);

    if (error) {
      console.error('Signed URL error:', error);
      throw new Error('Failed to generate document URL');
    }

    return data.signedUrl;
  },

  /**
   * Delete order document from storage
   */
  async deleteOrderDocument(documentPath: string): Promise<void> {
    const { error } = await supabase.storage
      .from('transition-attachments')
      .remove([documentPath]);

    if (error) {
      console.error('Delete error:', error);
      throw new Error('Failed to delete document');
    }
  },

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
};

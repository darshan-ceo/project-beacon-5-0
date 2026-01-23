/**
 * Judge Photo Service
 * Manages judge photos using Supabase Storage (avatars bucket)
 */

import { supabase } from '@/integrations/supabase/client';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const BUCKET_NAME = 'avatars';

export class JudgePhotoService {
  /**
   * Upload a judge's photo to Supabase Storage
   */
  async uploadJudgePhoto(
    file: File,
    judgeId: string, 
    onProgress?: (progress: number) => void
  ): Promise<string> {
    // Validate file
    const validation = this.validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    onProgress?.(10);

    // Generate storage path
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const storagePath = `judges/${judgeId}/photo.${fileExt}`;

    onProgress?.(30);

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error('Failed to upload photo');
    }

    onProgress?.(70);

    // Update judge record with photo path
    const { error: updateError } = await supabase
      .from('judges')
      .update({ photo_path: storagePath })
      .eq('id', judgeId);

    if (updateError) {
      console.error('Update error:', updateError);
      // Don't throw - photo is uploaded, just metadata update failed
    }

    onProgress?.(100);

    // Return public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath);

    return publicUrl;
  }

  /**
   * Delete a judge's photo
   */
  async deleteJudgePhoto(judgeId: string): Promise<void> {
    // Get current photo path from judge record
    const { data: judge } = await supabase
      .from('judges')
      .select('photo_path')
      .eq('id', judgeId)
      .single();

    if (judge?.photo_path) {
      // Delete from storage
      await supabase.storage
        .from(BUCKET_NAME)
        .remove([judge.photo_path]);
    }

    // Clear photo_path in judge record
    await supabase
      .from('judges')
      .update({ photo_path: null })
      .eq('id', judgeId);
  }

  /**
   * Get the public URL for a judge's photo
   */
  async getJudgePhotoUrl(judgeId: string): Promise<string | null> {
    // Get photo path from judge record
    const { data: judge, error } = await supabase
      .from('judges')
      .select('photo_path')
      .eq('id', judgeId)
      .single();

    if (error || !judge?.photo_path) {
      return null;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(judge.photo_path);

    return publicUrl;
  }

  /**
   * Validate file before upload
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return { 
        valid: false, 
        error: `Invalid file type. Allowed: ${ALLOWED_TYPES.map(t => t.split('/')[1]).join(', ')}` 
      };
    }

    if (file.size > MAX_SIZE) {
      return { 
        valid: false, 
        error: `File too large. Maximum size: ${MAX_SIZE / (1024 * 1024)}MB` 
      };
    }

    return { valid: true };
  }

  /**
   * Check if a judge has a photo
   */
  async hasPhoto(judgeId: string): Promise<boolean> {
    const { data: judge } = await supabase
      .from('judges')
      .select('photo_path')
      .eq('id', judgeId)
      .single();

    return !!judge?.photo_path;
  }
}

export const judgePhotoService = new JudgePhotoService();

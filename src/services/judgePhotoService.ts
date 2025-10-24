/**
 * Judge Photo Upload Service
 * Handles photo upload, validation, and storage for judge profiles
 */

export class JudgePhotoService {
  private readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  private readonly MAX_SIZE = 2 * 1024 * 1024; // 2MB
  private readonly STORAGE_KEY_PREFIX = 'judge_photo_';

  /**
   * Upload and store a judge photo
   * @param file - The image file to upload
   * @param judgeId - The judge's ID
   * @param onProgress - Optional callback for upload progress (0-100)
   * @returns Promise with the data URL of the uploaded photo
   */
  async uploadJudgePhoto(
    file: File,
    judgeId: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    // Validate file type
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      throw new Error(
        `Invalid file type. Allowed types: ${this.ALLOWED_TYPES.join(', ')}`
      );
    }

    // Validate file size
    if (file.size > this.MAX_SIZE) {
      throw new Error(
        `File size exceeds maximum limit of ${this.MAX_SIZE / (1024 * 1024)}MB`
      );
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      };

      reader.onload = () => {
        try {
          const dataUrl = reader.result as string;
          
          // Store in localStorage
          const storageKey = `${this.STORAGE_KEY_PREFIX}${judgeId}`;
          localStorage.setItem(storageKey, dataUrl);
          localStorage.setItem(`${storageKey}_timestamp`, Date.now().toString());
          
          onProgress?.(100);
          resolve(dataUrl);
        } catch (error) {
          if (error instanceof Error && error.name === 'QuotaExceededError') {
            reject(new Error('Storage quota exceeded. Please remove some photos and try again.'));
          } else {
            reject(error);
          }
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsDataURL(file);
    });
  }

  /**
   * Delete a judge photo
   * @param judgeId - The judge's ID
   */
  async deleteJudgePhoto(judgeId: string): Promise<void> {
    const storageKey = `${this.STORAGE_KEY_PREFIX}${judgeId}`;
    localStorage.removeItem(storageKey);
    localStorage.removeItem(`${storageKey}_timestamp`);
  }

  /**
   * Get a judge photo URL
   * @param judgeId - The judge's ID
   * @returns The photo data URL or null if not found
   */
  async getJudgePhotoUrl(judgeId: string): Promise<string | null> {
    const storageKey = `${this.STORAGE_KEY_PREFIX}${judgeId}`;
    return localStorage.getItem(storageKey);
  }

  /**
   * Validate if a file is acceptable
   * @param file - The file to validate
   * @returns Object with validation result and error message
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: `Invalid file type. Please upload ${this.ALLOWED_TYPES.map(t => t.split('/')[1].toUpperCase()).join(', ')} images only.`
      };
    }

    if (file.size > this.MAX_SIZE) {
      return {
        valid: false,
        error: `File size must be less than ${this.MAX_SIZE / (1024 * 1024)}MB`
      };
    }

    return { valid: true };
  }
}

export const judgePhotoService = new JudgePhotoService();

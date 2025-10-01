import { setItem, getItem, removeItem } from '@/data/storageShim';

export interface ProfileUpdateData {
  name?: string;
  email?: string;
  phone?: string;
  avatar?: string | null;
}

class ProfileService {
  private avatarUrl: string = '';

  async uploadAvatar(file: File, onProgress?: (progress: number) => void): Promise<string> {
    try {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Invalid file type. Please upload JPEG, PNG, or WebP images only.');
      }

      // Validate file size (max 2MB)
      const maxSize = 2 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error('File too large. Please upload images smaller than 2MB.');
      }

      // Create FormData for multipart upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'avatar');

      // Simulate multipart upload to /api/files
      return new Promise(async (resolve, reject) => {
        let progress = 0;
        const interval = setInterval(() => {
          progress += 10;
          if (onProgress) {
            onProgress(Math.min(progress, 90));
          }
          
          if (progress >= 90) {
            clearInterval(interval);
            setTimeout(async () => {
              if (onProgress) onProgress(100);
              
              // Create object URL for the uploaded file
              const url = URL.createObjectURL(file);
              this.avatarUrl = url;
              
              // Store using storageShim for persistence
              await setItem('userAvatar', url);
              await setItem('userAvatarTimestamp', Date.now().toString());
              
              resolve(url);
            }, 500);
          }
        }, 100);
      });
    } catch (error) {
      console.error('Avatar upload failed:', error);
      throw error;
    }
  }

  async updateProfile(data: ProfileUpdateData): Promise<void> {
    try {
      // Simulate API call to PATCH /api/users/me
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Save using storageShim
      const PROFILE_KEY = 'user_profile';
      const existingProfile = await getItem<any>(PROFILE_KEY);
      const updatedProfile = existingProfile 
        ? { ...existingProfile, ...data, updatedAt: new Date().toISOString() }
        : { ...data, updatedAt: new Date().toISOString() };
      
      await setItem(PROFILE_KEY, updatedProfile);
      console.log('Profile updated:', data);
    } catch (error) {
      console.error('Profile update failed:', error);
      throw error;
    }
  }

  async getProfile(): Promise<any> {
    try {
      const PROFILE_KEY = 'user_profile';
      return await getItem<any>(PROFILE_KEY);
    } catch (error) {
      console.error('Failed to load profile:', error);
      return null;
    }
  }

  async getAvatarUrl(): Promise<string> {
    const avatarUrl = await getItem<string>('userAvatar') || this.avatarUrl;
    const timestamp = await getItem<string>('userAvatarTimestamp');
    
    if (avatarUrl && timestamp) {
      return `${avatarUrl}?v=${timestamp}`;
    }
    
    return avatarUrl || '/placeholder.svg';
  }

  async deleteAvatar(): Promise<void> {
    const avatarUrl = await getItem<string>('userAvatar') || this.avatarUrl;
    if (avatarUrl) {
      URL.revokeObjectURL(avatarUrl);
      await removeItem('userAvatar');
      await removeItem('userAvatarTimestamp');
      this.avatarUrl = '';
    }
    
    // Update profile to remove avatar
    await this.updateProfile({ avatar: null });
  }
}

export const profileService = new ProfileService();

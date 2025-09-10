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
      return new Promise((resolve, reject) => {
        let progress = 0;
        const interval = setInterval(() => {
          progress += 10;
          if (onProgress) {
            onProgress(Math.min(progress, 90));
          }
          
          if (progress >= 90) {
            clearInterval(interval);
            setTimeout(() => {
              if (onProgress) onProgress(100);
              
              // Create object URL for the uploaded file
              const url = URL.createObjectURL(file);
              this.avatarUrl = url;
              
              // Store in localStorage for persistence
              localStorage.setItem('userAvatar', url);
              localStorage.setItem('userAvatarTimestamp', Date.now().toString());
              
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
      
      // Save to localStorage
      const PROFILE_KEY = 'user_profile';
      const existingProfile = localStorage.getItem(PROFILE_KEY);
      const updatedProfile = existingProfile 
        ? { ...JSON.parse(existingProfile), ...data, updatedAt: new Date().toISOString() }
        : { ...data, updatedAt: new Date().toISOString() };
      
      localStorage.setItem(PROFILE_KEY, JSON.stringify(updatedProfile));
      console.log('Profile updated:', data);
    } catch (error) {
      console.error('Profile update failed:', error);
      throw error;
    }
  }

  async getProfile(): Promise<any> {
    try {
      const PROFILE_KEY = 'user_profile';
      const savedProfile = localStorage.getItem(PROFILE_KEY);
      return savedProfile ? JSON.parse(savedProfile) : null;
    } catch (error) {
      console.error('Failed to load profile:', error);
      return null;
    }
  }

  async getAvatarUrl(): Promise<string> {
    const avatarUrl = localStorage.getItem('userAvatar') || this.avatarUrl;
    const timestamp = localStorage.getItem('userAvatarTimestamp');
    
    if (avatarUrl && timestamp) {
      return `${avatarUrl}?v=${timestamp}`;
    }
    
    return avatarUrl || '/placeholder.svg';
  }

  async deleteAvatar(): Promise<void> {
    const avatarUrl = localStorage.getItem('userAvatar') || this.avatarUrl;
    if (avatarUrl) {
      URL.revokeObjectURL(avatarUrl);
      localStorage.removeItem('userAvatar');
      localStorage.removeItem('userAvatarTimestamp');
      this.avatarUrl = '';
    }
    
    // Update profile to remove avatar
    await this.updateProfile({ avatar: null });
  }
}

export const profileService = new ProfileService();
export interface ProfileUpdateData {
  name?: string;
  email?: string;
  phone?: string;
  avatar?: string;
}

class ProfileService {
  private avatarUrl: string = '';

  async uploadAvatar(file: File): Promise<string> {
    try {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Invalid file type. Please upload a JPEG, PNG, or GIF image.');
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error('File size too large. Please upload an image smaller than 5MB.');
      }

      // Create object URL for preview (in real app, this would upload to server/cloud)
      const url = URL.createObjectURL(file);
      this.avatarUrl = url;
      
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return url;
    } catch (error) {
      console.error('Avatar upload failed:', error);
      throw error;
    }
  }

  async updateProfile(data: ProfileUpdateData): Promise<void> {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Save to localStorage
      const PROFILE_KEY = 'user_profile';
      const existingProfile = localStorage.getItem(PROFILE_KEY);
      const updatedProfile = existingProfile 
        ? { ...JSON.parse(existingProfile), ...data }
        : data;
      
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
    return this.avatarUrl;
  }

  async deleteAvatar(): Promise<void> {
    if (this.avatarUrl) {
      URL.revokeObjectURL(this.avatarUrl);
      this.avatarUrl = '';
    }
  }
}

export const profileService = new ProfileService();
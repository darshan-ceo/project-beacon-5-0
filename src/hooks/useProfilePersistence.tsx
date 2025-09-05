import { useEffect } from 'react';
import { useAppState } from '@/contexts/AppStateContext';
import { profileService } from '@/services/profileService';

export const useProfilePersistence = () => {
  const { state, dispatch } = useAppState();

  // Load profile on app initialization
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const savedProfile = await profileService.getProfile();
        if (savedProfile) {
          dispatch({ type: 'UPDATE_USER_PROFILE', payload: savedProfile });
        }
      } catch (error) {
        console.error('Failed to load user profile:', error);
      }
    };

    loadProfile();
  }, [dispatch]);

  // Auto-save profile changes
  useEffect(() => {
    const saveProfile = async () => {
      try {
        await profileService.updateProfile(state.userProfile);
      } catch (error) {
        console.error('Failed to auto-save profile:', error);
      }
    };

    // Debounce profile saves to avoid excessive writes
    const timeoutId = setTimeout(saveProfile, 1000);
    return () => clearTimeout(timeoutId);
  }, [state.userProfile]);

  return {
    userProfile: state.userProfile
  };
};
import { useEffect, useRef } from 'react';
import { useAppState } from '@/contexts/AppStateContext';
import { profileService } from '@/services/profileService';

export const useProfilePersistence = () => {
  const { state, dispatch } = useAppState();
  const isLoadingRef = useRef(false);
  const isSavingRef = useRef(false);

  // Load profile on app initialization
  useEffect(() => {
    if (isLoadingRef.current) return;
    
    const loadProfile = async () => {
      isLoadingRef.current = true;
      try {
        const savedProfile = await profileService.getProfile();
        if (savedProfile && !isSavingRef.current) {
          dispatch({ type: 'UPDATE_USER_PROFILE', payload: savedProfile });
        }
      } catch (error) {
        console.error('Failed to load user profile:', error);
      } finally {
        isLoadingRef.current = false;
      }
    };

    loadProfile();
  }, [dispatch]);

  // Auto-save profile changes (only if not currently loading)
  useEffect(() => {
    if (isLoadingRef.current || isSavingRef.current) return;

    const saveProfile = async () => {
      isSavingRef.current = true;
      try {
        await profileService.updateProfile(state.userProfile);
      } catch (error) {
        console.error('Failed to auto-save profile:', error);
      } finally {
        isSavingRef.current = false;
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
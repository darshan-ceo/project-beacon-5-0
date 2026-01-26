/**
 * Learning Progress Hook
 * Tracks user's progress through help content, tours, and onboarding
 */

import { useState, useEffect, useCallback } from 'react';

interface LearningProgress {
  completedTours: string[];
  completedArticles: string[];
  completedOnboardingSteps: string[];
  readChangelogIds: string[];
  lastVisitedHelp: string | null;
  totalTimeSpentMinutes: number;
  achievements: string[];
}

const STORAGE_KEY = 'help-learning-progress';

const defaultProgress: LearningProgress = {
  completedTours: [],
  completedArticles: [],
  completedOnboardingSteps: [],
  readChangelogIds: [],
  lastVisitedHelp: null,
  totalTimeSpentMinutes: 0,
  achievements: []
};

export function useLearningProgress() {
  const [progress, setProgress] = useState<LearningProgress>(defaultProgress);
  const [isLoading, setIsLoading] = useState(true);

  // Load progress from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setProgress({ ...defaultProgress, ...JSON.parse(stored) });
      }
    } catch (error) {
      console.error('[LearningProgress] Failed to load progress:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save progress to localStorage whenever it changes
  const saveProgress = useCallback((newProgress: LearningProgress) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newProgress));
    } catch (error) {
      console.error('[LearningProgress] Failed to save progress:', error);
    }
  }, []);

  const markTourCompleted = useCallback((tourId: string) => {
    setProgress(prev => {
      if (prev.completedTours.includes(tourId)) return prev;
      
      const newProgress = {
        ...prev,
        completedTours: [...prev.completedTours, tourId]
      };
      
      // Check for achievements
      if (newProgress.completedTours.length === 1) {
        newProgress.achievements = [...newProgress.achievements, 'first-tour'];
      }
      if (newProgress.completedTours.length >= 5) {
        newProgress.achievements = [...new Set([...newProgress.achievements, 'tour-explorer'])];
      }
      
      saveProgress(newProgress);
      return newProgress;
    });
  }, [saveProgress]);

  const markArticleRead = useCallback((articleId: string) => {
    setProgress(prev => {
      if (prev.completedArticles.includes(articleId)) return prev;
      
      const newProgress = {
        ...prev,
        completedArticles: [...prev.completedArticles, articleId]
      };
      
      // Check for achievements
      if (newProgress.completedArticles.length === 1) {
        newProgress.achievements = [...newProgress.achievements, 'first-read'];
      }
      if (newProgress.completedArticles.length >= 10) {
        newProgress.achievements = [...new Set([...newProgress.achievements, 'knowledge-seeker'])];
      }
      
      saveProgress(newProgress);
      return newProgress;
    });
  }, [saveProgress]);

  const markOnboardingStepCompleted = useCallback((stepId: string) => {
    setProgress(prev => {
      if (prev.completedOnboardingSteps.includes(stepId)) return prev;
      
      const newProgress = {
        ...prev,
        completedOnboardingSteps: [...prev.completedOnboardingSteps, stepId]
      };
      
      saveProgress(newProgress);
      return newProgress;
    });
  }, [saveProgress]);

  const markChangelogRead = useCallback((changelogId: string) => {
    setProgress(prev => {
      if (prev.readChangelogIds.includes(changelogId)) return prev;
      
      const newProgress = {
        ...prev,
        readChangelogIds: [...prev.readChangelogIds, changelogId]
      };
      
      saveProgress(newProgress);
      return newProgress;
    });
  }, [saveProgress]);

  const markAllChangelogRead = useCallback((changelogIds: string[]) => {
    setProgress(prev => {
      const newProgress = {
        ...prev,
        readChangelogIds: [...new Set([...prev.readChangelogIds, ...changelogIds])]
      };
      
      saveProgress(newProgress);
      return newProgress;
    });
  }, [saveProgress]);

  const setLastVisitedHelp = useCallback((helpId: string) => {
    setProgress(prev => {
      const newProgress = {
        ...prev,
        lastVisitedHelp: helpId
      };
      saveProgress(newProgress);
      return newProgress;
    });
  }, [saveProgress]);

  const addTimeSpent = useCallback((minutes: number) => {
    setProgress(prev => {
      const newProgress = {
        ...prev,
        totalTimeSpentMinutes: prev.totalTimeSpentMinutes + minutes
      };
      
      // Time-based achievements
      if (newProgress.totalTimeSpentMinutes >= 30) {
        newProgress.achievements = [...new Set([...newProgress.achievements, 'dedicated-learner'])];
      }
      if (newProgress.totalTimeSpentMinutes >= 120) {
        newProgress.achievements = [...new Set([...newProgress.achievements, 'power-user'])];
      }
      
      saveProgress(newProgress);
      return newProgress;
    });
  }, [saveProgress]);

  const resetProgress = useCallback(() => {
    setProgress(defaultProgress);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const isTourCompleted = useCallback((tourId: string) => {
    return progress.completedTours.includes(tourId);
  }, [progress.completedTours]);

  const isArticleRead = useCallback((articleId: string) => {
    return progress.completedArticles.includes(articleId);
  }, [progress.completedArticles]);

  const isOnboardingStepCompleted = useCallback((stepId: string) => {
    return progress.completedOnboardingSteps.includes(stepId);
  }, [progress.completedOnboardingSteps]);

  const isChangelogRead = useCallback((changelogId: string) => {
    return progress.readChangelogIds.includes(changelogId);
  }, [progress.readChangelogIds]);

  const getUnreadChangelogCount = useCallback((allChangelogIds: string[]) => {
    return allChangelogIds.filter(id => !progress.readChangelogIds.includes(id)).length;
  }, [progress.readChangelogIds]);

  const hasAchievement = useCallback((achievementId: string) => {
    return progress.achievements.includes(achievementId);
  }, [progress.achievements]);

  const getOnboardingProgress = useCallback((totalSteps: number) => {
    const completed = progress.completedOnboardingSteps.length;
    return {
      completed,
      total: totalSteps,
      percentage: totalSteps > 0 ? Math.round((completed / totalSteps) * 100) : 0
    };
  }, [progress.completedOnboardingSteps]);

  return {
    progress,
    isLoading,
    markTourCompleted,
    markArticleRead,
    markOnboardingStepCompleted,
    markChangelogRead,
    markAllChangelogRead,
    setLastVisitedHelp,
    addTimeSpent,
    resetProgress,
    isTourCompleted,
    isArticleRead,
    isOnboardingStepCompleted,
    isChangelogRead,
    getUnreadChangelogCount,
    hasAchievement,
    getOnboardingProgress
  };
}

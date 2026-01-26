/**
 * Shepherd.js Tour Hook
 * Provides guided tour functionality using Shepherd.js
 */

import { useCallback, useRef, useEffect } from 'react';
import Shepherd from 'shepherd.js';
import 'shepherd.js/dist/css/shepherd.css';
import '@/styles/shepherd-custom.css';

export interface TourStep {
  target: string;
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  action?: 'click' | 'hover' | 'none';
  placement?: string;
}

export interface TourConfig {
  id: string;
  title: string;
  steps: TourStep[];
  onComplete?: () => void;
  onCancel?: () => void;
}

// Type for Shepherd Tour instance
type ShepherdTour = InstanceType<typeof Shepherd.Tour>;

export const useShepherdTour = () => {
  const tourRef = useRef<ShepherdTour | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (tourRef.current) {
        tourRef.current.complete();
        tourRef.current = null;
      }
    };
  }, []);

  const startTour = useCallback((config: TourConfig) => {
    // Cancel any existing tour
    if (tourRef.current) {
      tourRef.current.complete();
    }

    // Create new tour instance
    const tour = new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        classes: 'shepherd-theme-custom',
        scrollTo: { behavior: 'smooth', block: 'center' },
        cancelIcon: {
          enabled: true
        },
        modalOverlayOpeningPadding: 8,
        modalOverlayOpeningRadius: 8,
      }
    });

    // Add steps
    config.steps.forEach((step, index) => {
      const isFirst = index === 0;
      const isLast = index === config.steps.length - 1;

      // Map position to Shepherd placement
      const getPlacement = (pos?: string): string => {
        const placementMap: Record<string, string> = {
          'top': 'top',
          'bottom': 'bottom',
          'left': 'left',
          'right': 'right',
          'auto': 'auto'
        };
        return placementMap[pos || 'bottom'] || 'bottom';
      };

      tour.addStep({
        id: `step-${index}`,
        title: step.title,
        text: step.content,
        attachTo: step.target ? {
          element: step.target,
          on: getPlacement(step.position || step.placement) as any
        } : undefined,
        buttons: [
          ...(isFirst ? [] : [{
            text: 'Previous',
            action: tour.back,
            classes: 'shepherd-button-secondary'
          }]),
          {
            text: isLast ? 'Complete' : 'Next',
            action: isLast ? tour.complete : tour.next,
            classes: 'shepherd-button-primary'
          }
        ],
        beforeShowPromise: () => {
          return new Promise<void>((resolve) => {
            // Allow DOM to settle before showing step
            setTimeout(resolve, 100);
          });
        }
      });
    });

    // Set up event handlers
    tour.on('complete', () => {
      console.log(`[Tour] Completed: ${config.id}`);
      config.onComplete?.();
      tourRef.current = null;
    });

    tour.on('cancel', () => {
      console.log(`[Tour] Cancelled: ${config.id}`);
      config.onCancel?.();
      tourRef.current = null;
    });

    // Start the tour
    tourRef.current = tour;
    tour.start();

    return tour;
  }, []);

  const cancelTour = useCallback(() => {
    if (tourRef.current) {
      tourRef.current.cancel();
      tourRef.current = null;
    }
  }, []);

  const isRunning = useCallback(() => {
    return tourRef.current?.isActive() || false;
  }, []);

  return {
    startTour,
    cancelTour,
    isRunning
  };
};

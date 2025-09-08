import Shepherd from 'shepherd.js';
import 'shepherd.js/dist/css/shepherd.css';

interface TourStep {
  id: string;
  title: string;
  text: string;
  action?: 'click' | 'hover' | 'none';
  attachTo?: {
    element: string;
    on: 'top' | 'bottom' | 'left' | 'right' | 'center';
  };
  buttons?: Array<{
    text: string;
    action?: 'next' | 'back' | 'complete' | 'skip';
    classes?: string;
  }>;
  beforeShow?: () => void;
  when?: {
    show?: () => void;
    hide?: () => void;
  };
}

interface Tour {
  id: string;
  title: string;
  description: string;
  module: string;
  steps: TourStep[];
  roles: string[];
  onComplete?: () => void;
  onCancel?: () => void;
}

class TourService {
  private tours: Map<string, Tour> = new Map();
  private activeTour: any = null;
  private tourPreferences: Map<string, { completed: boolean; dontShowAgain: boolean }> = new Map();

  constructor() {
    this.loadPreferences();
    this.initializeTours();
  }

  private async initializeTours() {
    try {
      // Load tours from JSON file
      const response = await fetch('/help/tours.json');
      const jsonTours = await response.json();
      
      // Convert JSON format to Shepherd.js format
      for (const jsonTour of jsonTours) {
        const tour: Tour = {
          id: jsonTour.id,
          title: jsonTour.title,
          description: jsonTour.description,
          module: jsonTour.module,
          roles: jsonTour.roles.includes('all') ? ['Users', 'Admin', 'Partner/CA'] : jsonTour.roles,
          steps: jsonTour.steps.map((step: any) => ({
            id: step.target.replace(/[\[\]'"-]/g, '').replace(/[^a-zA-Z0-9]/g, '-'),
            title: step.title,
            text: step.content,
            action: step.action || 'none',
            attachTo: step.target ? {
              element: step.target,
              on: this.convertPosition(step.position)
            } : undefined
          }))
        };
        
        this.tours.set(tour.id, tour);
      }
    } catch (error) {
      console.error('Failed to load tours from JSON:', error);
      // Fallback to hardcoded tours if JSON loading fails
      this.initializeFallbackTours();
    }
  }

  private convertPosition(position: string): 'top' | 'bottom' | 'left' | 'right' | 'center' {
    switch (position) {
      case 'top': return 'top';
      case 'bottom': return 'bottom';
      case 'left': return 'left';
      case 'right': return 'right';
      default: return 'bottom';
    }
  }

  private initializeFallbackTours() {
    // Fallback hardcoded tours for when JSON loading fails
    this.tours.set('create-case', {
      id: 'create-case',
      title: 'Create a New Case',
      description: 'Learn how to create and set up a new legal case',
      module: 'cases',
      roles: ['Users', 'Admin'],
      steps: [
        {
          id: 'welcome',
          title: 'Welcome to Case Creation',
          text: 'This tour will guide you through creating a new case in the system. Let\'s get started!'
        },
        {
          id: 'case-button',
          title: 'Start with New Case',
          text: 'Click the "New Case" button to begin creating a case.',
          attachTo: {
            element: '[data-tour="new-case-button"]',
            on: 'bottom'
          }
        }
      ]
    });
  }

  private loadPreferences() {
    try {
      const stored = localStorage.getItem('tour-preferences');
      if (stored) {
        const preferences = JSON.parse(stored);
        this.tourPreferences = new Map(Object.entries(preferences));
      }
    } catch (error) {
      console.warn('Failed to load tour preferences:', error);
    }
  }

  private savePreferences() {
    try {
      const preferences = Object.fromEntries(this.tourPreferences);
      localStorage.setItem('tour-preferences', JSON.stringify(preferences));
    } catch (error) {
      console.warn('Failed to save tour preferences:', error);
    }
  }

  /**
   * Get available tours for a user role
   */
  getAvailableTours(userRole: string, module?: string): Tour[] {
    const tours = Array.from(this.tours.values());
    
    return tours.filter(tour => {
      // Check role access
      if (!tour.roles.includes(userRole)) {
        return false;
      }
      
      // Check module filter
      if (module && tour.module !== module) {
        return false;
      }
      
      // Check if user has marked as "don't show again"
      const preferences = this.tourPreferences.get(tour.id);
      if (preferences?.dontShowAgain) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Start a specific tour
   */
  async startTour(tourId: string): Promise<boolean> {
    const tour = this.tours.get(tourId);
    if (!tour) {
      console.error(`Tour not found: ${tourId}`);
      return false;
    }

    // Navigate to correct page if needed
    await this.navigateToTourModule(tour.module);

    // Stop any existing tour
    if (this.activeTour) {
      this.activeTour.complete();
    }

    try {
      // Wait for navigation to complete and DOM elements to be available
      await this.waitForTourElements(tour);

      // Check if required DOM elements exist for this tour
      const missingElements = this.checkTourElementsExist(tour);
      if (missingElements.length > 0) {
        console.warn(`Tour "${tourId}" has missing DOM elements:`, missingElements);
        // Still allow tour to start but log warnings
      }

      // Create Shepherd tour instance
      this.activeTour = new Shepherd.Tour({
        useModalOverlay: false, // Disable by default, enable per step
        defaultStepOptions: {
          classes: 'bg-background border border-border shadow-lg rounded-lg',
          scrollTo: { behavior: 'smooth', block: 'center' },
          cancelIcon: {
            enabled: true,
          },
          buttons: [
            {
              text: 'Skip Tour',
              classes: 'btn btn-outline',
              action: () => this.skipTour()
            },
            {
              text: 'Back',
              classes: 'btn btn-outline',
              action: () => this.activeTour?.back()
            },
            {
              text: 'Next',
              classes: 'btn btn-primary',
              action: () => this.activeTour?.next()
            }
          ]
        }
      });

      // Add steps to tour
      tour.steps.forEach((step, index) => {
        const isLast = index === tour.steps.length - 1;
        const isInteractive = step.action === 'click' || step.action === 'hover';
        
        this.activeTour!.addStep({
          id: step.id,
          title: step.title,
          text: step.text,
          attachTo: step.attachTo,
          modalOverlay: !isInteractive, // Enable overlay only for non-interactive steps
          modalOverlayOpeningPadding: isInteractive ? 30 : 10,
          modalOverlayOpeningRadius: isInteractive ? 15 : 8,
          canClickTarget: isInteractive,
          buttons: step.buttons || [
            {
              text: 'Skip Tour',
              classes: 'btn btn-outline mr-2',
              action: () => this.skipTour()
            },
            ...(index > 0 ? [{
              text: 'Back',
              classes: 'btn btn-outline mr-2',
              action: () => this.activeTour?.back()
            }] : []),
            {
              text: isLast ? 'Complete' : (isInteractive ? 'Continue' : 'Next'),
              classes: 'btn btn-primary',
              action: isLast 
                ? () => this.completeTour(tourId)
                : () => this.activeTour?.next()
            }
          ],
          beforeShowPromise: () => {
            return new Promise<void>((resolve) => {
              if (step.beforeShow) {
                step.beforeShow();
              }
              
              // Check if the target element exists before showing this step
              if (step.attachTo?.element) {
                const element = document.querySelector(step.attachTo.element);
                if (!element) {
                  console.warn(`Tour step "${step.id}" target element not found: ${step.attachTo.element}`);
                }
              }
              
              // Small delay to ensure DOM elements are ready
              setTimeout(resolve, 100);
            });
          },
          when: {
            ...step.when,
            show: () => {
              // Enhanced element detection with retry logic
              const waitForElement = (retries = 10) => {
                if (step.attachTo?.element) {
                  const element = document.querySelector(step.attachTo.element);
                  if (!element) {
                    if (retries > 0) {
                      // Element not found, wait and retry
                      setTimeout(() => waitForElement(retries - 1), 200);
                      return;
                    } else {
                      // Element not found after retries, show warning but continue
                      console.warn(`Tour element not found: ${step.attachTo.element}`);
                      return;
                    }
                  }
                  
                  // Element found, scroll and highlight it
                  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  
                  // Add different highlighting for interactive elements
                  if (isInteractive) {
                    element.classList.add('tour-highlight-interactive');
                    // Add pointer cursor to indicate clickability
                    (element as HTMLElement).style.cursor = 'pointer';
                    // Add pulse animation for click actions
                    if (step.action === 'click') {
                      element.classList.add('tour-pulse');
                    }
                  } else {
                    element.classList.add('tour-highlight');
                  }
                  
                  // Remove highlighting after delay
                  setTimeout(() => {
                    element.classList.remove('tour-highlight', 'tour-highlight-interactive', 'tour-pulse');
                    (element as HTMLElement).style.cursor = '';
                  }, 8000);
                } else {
                  // No element to attach to, just show the step
                  console.log('Step has no target element, showing as floating step');
                }
              }
              waitForElement();
              if (step.when?.show) step.when.show();
            },
            hide: () => {
              if (step.attachTo?.element) {
                const element = document.querySelector(step.attachTo.element);
                if (element) {
                  element.classList.remove('tour-highlight', 'tour-highlight-interactive', 'tour-pulse');
                  (element as HTMLElement).style.cursor = '';
                }
              }
              if (step.when?.hide) step.when.hide();
            }
          }
        });
      });

      // Tour event handlers
      this.activeTour.on('complete', () => {
        this.completeTour(tourId);
      });

      this.activeTour.on('cancel', () => {
        if (tour.onCancel) {
          tour.onCancel();
        }
        this.activeTour = null;
      });

      // Start the tour
      this.activeTour.start();
      
      console.log(`Tour "${tourId}" started successfully`);
      return true;
    } catch (error) {
      console.error('Failed to start tour:', error);
      return false;
    }
  }

  /**
   * Navigate to the correct module/page before starting tour
   */
  private async navigateToTourModule(module: string): Promise<void> {
    const currentPath = window.location.pathname;
    let targetPath = '/';

    switch (module) {
      case 'cases':
        targetPath = '/';
        break;
      case 'documents':
        targetPath = '/';
        break;
      case 'hearings':
        targetPath = '/';
        break;
      case 'tasks':
        targetPath = '/';
        break;
      case 'reports':
        targetPath = '/';
        break;
      case 'client-portal':
        targetPath = '/';
        break;
      default:
        targetPath = '/';
    }

    if (currentPath !== targetPath) {
      window.history.pushState({}, '', targetPath);
      // Dispatch a custom event to trigger route change if using React Router
      window.dispatchEvent(new PopStateEvent('popstate'));
      // Wait for navigation
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  /**
   * Wait for tour elements to be available in DOM
   */
  private async waitForTourElements(tour: Tour, maxAttempts: number = 20): Promise<void> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const elementsWithTargets = tour.steps.filter(step => step.attachTo?.element);
      const foundElements = elementsWithTargets.filter(step => 
        document.querySelector(step.attachTo!.element)
      );
      
      // If we found most elements or no elements have targets, proceed
      if (foundElements.length >= Math.ceil(elementsWithTargets.length * 0.5) || elementsWithTargets.length === 0) {
        return;
      }
      
      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  }

  /**
   * Check if required DOM elements exist for a tour
   */
  private checkTourElementsExist(tour: Tour): string[] {
    const missingElements: string[] = [];
    
    tour.steps.forEach(step => {
      if (step.attachTo?.element) {
        const element = document.querySelector(step.attachTo.element);
        if (!element) {
          missingElements.push(step.attachTo.element);
        }
      }
    });
    
    return missingElements;
  }

  /**
   * Complete current tour
   */
  private completeTour(tourId: string) {
    const tour = this.tours.get(tourId);
    
    // Mark as completed
    this.tourPreferences.set(tourId, {
      completed: true,
      dontShowAgain: false
    });
    this.savePreferences();

    // Call tour's onComplete handler
    if (tour?.onComplete) {
      tour.onComplete();
    }

    this.activeTour = null;
  }

  /**
   * Skip current tour
   */
  private skipTour() {
    if (this.activeTour) {
      this.activeTour.complete();
    }
  }

  /**
   * Mark tour as "don't show again"
   */
  markTourAsHidden(tourId: string) {
    this.tourPreferences.set(tourId, {
      completed: false,
      dontShowAgain: true
    });
    this.savePreferences();
  }

  /**
   * Reset tour preferences (for testing)
   */
  resetTourPreferences() {
    this.tourPreferences.clear();
    localStorage.removeItem('tour-preferences');
  }

  /**
   * Check if tour is completed
   */
  isTourCompleted(tourId: string): boolean {
    return this.tourPreferences.get(tourId)?.completed || false;
  }

  /**
   * Get tour completion statistics
   */
  getTourStats(): { total: number; completed: number; hidden: number } {
    const total = this.tours.size;
    let completed = 0;
    let hidden = 0;

    this.tourPreferences.forEach(pref => {
      if (pref.completed) completed++;
      if (pref.dontShowAgain) hidden++;
    });

    return { total, completed, hidden };
  }
}

export const tourService = new TourService();
export type { Tour, TourStep };
import Shepherd from 'shepherd.js';
import 'shepherd.js/dist/css/shepherd.css';

interface TourStep {
  id: string;
  title: string;
  text: string;
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
    this.initializeTours();
    this.loadPreferences();
  }

  private initializeTours() {
    // Create Case Tour
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
        },
        {
          id: 'case-form',
          title: 'Fill Case Details',
          text: 'Enter the basic case information including case number, title, and description.',
          attachTo: {
            element: '[data-tour="case-form"]',
            on: 'left'
          }
        },
        {
          id: 'client-selection',
          title: 'Select Client',
          text: 'Choose the client for this case from the dropdown or create a new client.',
          attachTo: {
            element: '[data-tour="client-selector"]',
            on: 'top'
          }
        },
        {
          id: 'court-selection',
          title: 'Choose Court',
          text: 'Select the appropriate court where this case will be heard.',
          attachTo: {
            element: '[data-tour="court-selector"]',
            on: 'top'
          }
        },
        {
          id: 'case-lifecycle',
          title: 'Set Initial Stage',
          text: 'Choose the initial lifecycle stage for your case.',
          attachTo: {
            element: '[data-tour="lifecycle-selector"]',
            on: 'right'
          }
        },
        {
          id: 'save-case',
          title: 'Save Your Case',
          text: 'Once all details are filled, click Save to create the case.',
          attachTo: {
            element: '[data-tour="save-case-button"]',
            on: 'top'
          }
        }
      ]
    });

    // DMS Upload Tour
    this.tours.set('dms-upload', {
      id: 'dms-upload',
      title: 'Upload Documents to DMS',
      description: 'Learn how to upload and organize documents in the Document Management System',
      module: 'documents',
      roles: ['Users', 'Admin'],
      steps: [
        {
          id: 'dms-welcome',
          title: 'Document Management System',
          text: 'Learn how to upload, organize, and manage documents for your cases.'
        },
        {
          id: 'select-case',
          title: 'Select Case',
          text: 'First, select the case you want to upload documents for.',
          attachTo: {
            element: '[data-tour="case-selector-dms"]',
            on: 'bottom'
          }
        },
        {
          id: 'upload-area',
          title: 'Upload Documents',
          text: 'Drag and drop files here or click to select files from your computer.',
          attachTo: {
            element: '[data-tour="upload-area"]',
            on: 'top'
          }
        },
        {
          id: 'document-categories',
          title: 'Categorize Documents',
          text: 'Select the appropriate category for your document (Pleading, Evidence, Correspondence, etc.)',
          attachTo: {
            element: '[data-tour="document-category"]',
            on: 'right'
          }
        },
        {
          id: 'folder-organization',
          title: 'Organize in Folders',
          text: 'Create folders or select existing ones to organize your documents.',
          attachTo: {
            element: '[data-tour="folder-tree"]',
            on: 'left'
          }
        },
        {
          id: 'document-metadata',
          title: 'Add Document Details',
          text: 'Fill in document metadata like title, description, and tags for better searchability.',
          attachTo: {
            element: '[data-tour="document-metadata"]',
            on: 'top'
          }
        }
      ]
    });

    // Schedule Hearing Tour
    this.tours.set('schedule-hearing', {
      id: 'schedule-hearing',
      title: 'Schedule a Hearing',
      description: 'Learn how to schedule hearings and manage court dates',
      module: 'hearings',
      roles: ['Users', 'Admin'],
      steps: [
        {
          id: 'hearing-welcome',
          title: 'Hearing Management',
          text: 'Learn how to schedule hearings and manage important court dates.'
        },
        {
          id: 'new-hearing',
          title: 'Create New Hearing',
          text: 'Click "Schedule Hearing" to create a new hearing entry.',
          attachTo: {
            element: '[data-tour="new-hearing-button"]',
            on: 'bottom'
          }
        },
        {
          id: 'hearing-case',
          title: 'Select Case',
          text: 'Choose the case for which you\'re scheduling the hearing.',
          attachTo: {
            element: '[data-tour="hearing-case-selector"]',
            on: 'top'
          }
        },
        {
          id: 'hearing-date',
          title: 'Set Date and Time',
          text: 'Select the hearing date and time from the calendar picker.',
          attachTo: {
            element: '[data-tour="hearing-datetime"]',
            on: 'left'
          }
        },
        {
          id: 'hearing-court',
          title: 'Select Court',
          text: 'Choose the court and courtroom where the hearing will take place.',
          attachTo: {
            element: '[data-tour="hearing-court"]',
            on: 'right'
          }
        },
        {
          id: 'hearing-type',
          title: 'Hearing Type',
          text: 'Specify the type of hearing (Arguments, Evidence, Final Hearing, etc.)',
          attachTo: {
            element: '[data-tour="hearing-type"]',
            on: 'top'
          }
        },
        {
          id: 'hearing-participants',
          title: 'Add Participants',
          text: 'Add judges, advocates, and other participants who will attend the hearing.',
          attachTo: {
            element: '[data-tour="hearing-participants"]',
            on: 'bottom'
          }
        },
        {
          id: 'hearing-reminders',
          title: 'Set Reminders',
          text: 'Configure email and SMS reminders for the hearing.',
          attachTo: {
            element: '[data-tour="hearing-reminders"]',
            on: 'top'
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

    // Stop any existing tour
    if (this.activeTour) {
      this.activeTour.complete();
    }

    try {
      // Check if required DOM elements exist for this tour
      const missingElements = this.checkTourElementsExist(tour);
      if (missingElements.length > 0) {
        console.warn(`Tour "${tourId}" has missing DOM elements:`, missingElements);
        // Still allow tour to start but log warnings
      }

      // Create Shepherd tour instance
      this.activeTour = new Shepherd.Tour({
        useModalOverlay: true,
        defaultStepOptions: {
          classes: 'bg-background border border-border shadow-lg rounded-lg',
          scrollTo: { behavior: 'smooth', block: 'center' },
          modalOverlayOpeningPadding: 10,
          modalOverlayOpeningRadius: 8,
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
        
        this.activeTour!.addStep({
          id: step.id,
          title: step.title,
          text: step.text,
          attachTo: step.attachTo,
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
              text: isLast ? 'Complete' : 'Next',
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
              if (step.attachTo?.element) {
                const element = document.querySelector(step.attachTo.element);
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  // Highlight the element
                  element.classList.add('tour-highlight');
                  setTimeout(() => element.classList.remove('tour-highlight'), 3000);
                }
              }
              if (step.when?.show) step.when.show();
            },
            hide: () => {
              if (step.attachTo?.element) {
                const element = document.querySelector(step.attachTo.element);
                if (element) {
                  element.classList.remove('tour-highlight');
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
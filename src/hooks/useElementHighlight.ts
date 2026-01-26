/**
 * Element Highlight Hook
 * Scrolls to and highlights target UI elements when navigating from help
 */

import { useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

// CSS for highlight animation (injected once)
const HIGHLIGHT_STYLES = `
  @keyframes help-highlight-pulse {
    0%, 100% { 
      box-shadow: 0 0 0 4px hsl(var(--primary) / 0.3), 0 0 0 8px hsl(var(--primary) / 0.1);
    }
    50% { 
      box-shadow: 0 0 0 6px hsl(var(--primary) / 0.4), 0 0 0 12px hsl(var(--primary) / 0.15);
    }
  }
  
  .help-highlight-active {
    position: relative;
    z-index: 50;
    animation: help-highlight-pulse 1.5s ease-in-out 3;
    outline: 2px solid hsl(var(--primary));
    outline-offset: 2px;
    border-radius: 4px;
  }
  
  .help-highlight-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.3);
    z-index: 40;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  .help-highlight-overlay.active {
    opacity: 1;
  }
`;

let stylesInjected = false;

const injectStyles = () => {
  if (stylesInjected) return;
  const style = document.createElement('style');
  style.id = 'help-highlight-styles';
  style.textContent = HIGHLIGHT_STYLES;
  document.head.appendChild(style);
  stylesInjected = true;
};

export interface HighlightOptions {
  path: string;
  tab?: string;
  element?: string;
  action?: string;
}

export const useElementHighlight = () => {
  const navigate = useNavigate();
  
  /**
   * Navigate to a location and optionally highlight an element
   */
  const navigateAndHighlight = useCallback((options: HighlightOptions) => {
    injectStyles();
    
    // Build URL with tab and highlight params
    const params = new URLSearchParams();
    if (options.tab) params.set('tab', options.tab);
    if (options.element) params.set('highlight', options.element);
    if (options.action) params.set('action', options.action);
    
    const queryString = params.toString();
    const url = queryString ? `${options.path}?${queryString}` : options.path;
    
    navigate(url);
    
    // If element specified, wait for navigation and highlight
    if (options.element) {
      setTimeout(() => {
        highlightElement(options.element!);
      }, 500); // Wait for page render
    }
  }, [navigate]);
  
  return { navigateAndHighlight };
};

/**
 * Find and highlight an element by various selectors
 */
export const highlightElement = (elementId: string): boolean => {
  injectStyles();
  
  // Try multiple selector strategies
  const selectors = [
    `[data-help-id="${elementId}"]`,
    `[data-testid="${elementId}"]`,
    `#${elementId}`,
    `[aria-label*="${elementId}"]`,
    `button:has-text("${elementId}")`,
  ];
  
  let element: HTMLElement | null = null;
  
  for (const selector of selectors) {
    try {
      element = document.querySelector(selector);
      if (element) break;
    } catch {
      // Invalid selector, continue
    }
  }
  
  // Fallback: search by text content
  if (!element) {
    const allElements = document.querySelectorAll('button, [role="button"], a, h1, h2, h3, label');
    for (const el of allElements) {
      if (el.textContent?.toLowerCase().includes(elementId.toLowerCase())) {
        element = el as HTMLElement;
        break;
      }
    }
  }
  
  if (!element) {
    console.log('[ElementHighlight] Element not found:', elementId);
    return false;
  }
  
  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'help-highlight-overlay';
  document.body.appendChild(overlay);
  
  // Scroll element into view
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  
  // Apply highlight after scroll
  setTimeout(() => {
    overlay.classList.add('active');
    element!.classList.add('help-highlight-active');
    
    // Remove highlight after animation completes
    setTimeout(() => {
      element!.classList.remove('help-highlight-active');
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 300);
    }, 4500); // 3 pulses at 1.5s each
  }, 300);
  
  return true;
};

/**
 * Hook to handle highlight param on page load
 */
export const useHighlightOnLoad = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const checkAndHighlight = useCallback(() => {
    const highlightId = searchParams.get('highlight');
    if (highlightId) {
      // Delay to ensure DOM is ready
      setTimeout(() => {
        highlightElement(highlightId);
        // Remove highlight param from URL
        searchParams.delete('highlight');
        setSearchParams(searchParams, { replace: true });
      }, 300);
    }
  }, [searchParams, setSearchParams]);
  
  return { checkAndHighlight };
};

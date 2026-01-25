import { useEffect, useCallback, useRef } from 'react';
import { useAppStateSafe } from '@/contexts/AppStateContext';
import { calculateSLAStatus } from '@/services/slaService';

/**
 * Hook for periodic SLA status recalculation
 * Ensures timeline breach statuses are always current as time passes
 * 
 * - Recalculates on mount
 * - Recalculates every 15 minutes
 * - Recalculates when window regains focus (user returns to tab)
 */
export const useSLARecalculation = () => {
  const appState = useAppStateSafe();
  const isRecalculatingRef = useRef(false);
  
  // Handle context not being available (during hot reload or before provider mounts)
  const state = appState?.state;
  const rawDispatch = appState?.rawDispatch;

  const recalculateSLAStatuses = useCallback(() => {
    // Skip if context is not available or no dispatch function
    if (!state || !rawDispatch) return;
    
    // Prevent concurrent recalculations
    if (isRecalculatingRef.current) return;
    isRecalculatingRef.current = true;

    console.log('[SLA] Recalculating SLA statuses for', state.cases.length, 'cases');
    
    let updatedCount = 0;
    
    state.cases.forEach(caseItem => {
      // Only calculate SLA for active cases
      if (caseItem.status === 'Active') {
        const newStatus = calculateSLAStatus(caseItem as any);
        
        // Only dispatch if status actually changed
        if (newStatus !== caseItem.timelineBreachStatus) {
          updatedCount++;
          rawDispatch({
            type: 'UPDATE_CASE',
            payload: { 
              id: caseItem.id, 
              timelineBreachStatus: newStatus 
            } as any
          });
        }
      }
    });

    if (updatedCount > 0) {
      console.log('[SLA] Updated', updatedCount, 'cases with new SLA status');
    }

    isRecalculatingRef.current = false;
  }, [state?.cases, rawDispatch]);

  useEffect(() => {
    // Skip if context is not available
    if (!state) return;
    
    // Only run if we have cases loaded
    if (state.cases.length === 0) return;

    // Recalculate on mount (after cases are loaded)
    recalculateSLAStatuses();

    // Recalculate every 15 minutes
    const interval = setInterval(recalculateSLAStatuses, 15 * 60 * 1000);

    // Recalculate when window regains focus (user returns to tab)
    const handleFocus = () => {
      console.log('[SLA] Window focused, recalculating SLA statuses');
      recalculateSLAStatuses();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [recalculateSLAStatuses, state?.cases?.length]);

  return { recalculateSLAStatuses };
};

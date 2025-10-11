import { useState, useEffect, useMemo } from 'react';
import { useAppState } from '@/contexts/AppStateContext';
import { useRelationships } from './useRelationships';

export interface FormContext {
  clientId?: string;
  caseId?: string;
  courtId?: string;
  judgeId?: string;
}

export const useContextualForms = (initialContext?: FormContext) => {
  const { state } = useAppState();
  const { getCaseWithClient, getJudgesForCourt } = useRelationships();
  const [context, setContext] = useState<FormContext>(initialContext || {});

  // Memoize initial context to prevent unnecessary re-renders
  const memoizedInitialContext = useMemo(() => initialContext, [
    initialContext?.clientId,
    initialContext?.caseId,
    initialContext?.courtId,
    initialContext?.judgeId
  ]);

  // Sync context with initialContext changes only when it actually changes
  useEffect(() => {
    if (memoizedInitialContext) {
      setContext(memoizedInitialContext);
    }
  }, [memoizedInitialContext]);

  // Auto-fill context when case is selected
  useEffect(() => {
    if (context.caseId && !context.clientId) {
      const caseWithClient = getCaseWithClient(context.caseId);
      if (caseWithClient?.client) {
        setContext(prev => ({ ...prev, clientId: caseWithClient.client!.id }));
      }
    }
  }, [context.caseId, context.clientId, getCaseWithClient]);

  // Get available clients for dropdowns
  const getAvailableClients = () => {
    return state.clients.filter(c => c.status === 'Active');
  };

  // Get available cases (optionally filtered by client)
  const getAvailableCases = (clientId?: string) => {
    if (clientId) {
      return state.cases.filter(c => c.clientId === clientId);
    }
    return state.cases;
  };

  // Get available courts
  const getAvailableCourts = () => {
    return state.courts;
  };

  // Get available judges (filtered by court if context.courtId is set)
  const getAvailableJudges = (courtId?: string) => {
    const targetCourtId = courtId || context.courtId;
    if (targetCourtId) {
      return getJudgesForCourt(targetCourtId);
    }
    return state.judges.filter(j => j.status === 'Active');
  };

  // Get current context details with extended metadata
  const getContextDetails = () => {
    const client = context.clientId ? state.clients.find(c => c.id === context.clientId) : null;
    const case_ = context.caseId ? state.cases.find(c => c.id === context.caseId) : null;
    const court = context.courtId ? state.courts.find(c => c.id === context.courtId) : null;
    const judge = context.judgeId ? state.judges.find(j => j.id === context.judgeId) : null;

    // Safely extract location from client address
    let clientLocation: string | undefined;
    if (client?.address) {
      if (typeof client.address === 'object' && 'city' in client.address && 'state' in client.address) {
        clientLocation = `${client.address.city}, ${client.address.state}`;
      } else if (typeof client.address === 'string') {
        clientLocation = client.address;
      }
    }

    return { 
      client, 
      case: case_, 
      court, 
      judge,
      // Extended metadata for client context display
      clientName: client?.name,
      clientLocation,
      clientTier: client?.category, // Using category as tier proxy
      caseNumber: case_?.caseNumber,
      caseTitle: case_?.title,
      caseStage: case_?.currentStage,
      amountInDispute: case_?.amountInDispute
    };
  };

  // Update context (with validation)
  const updateContext = (updates: Partial<FormContext>) => {
    setContext(prev => {
      const newContext = { ...prev, ...updates };
      
      // Clear dependent fields when parent changes
      if (updates.caseId !== prev.caseId) {
        // If case changes, clear any case-dependent context
        // Client will be auto-filled from the new case
      }
      
      if (updates.courtId !== prev.courtId) {
        // If court changes, clear judge selection
        newContext.judgeId = undefined;
      }

      return newContext;
    });
  };

  // Check if form has required context for the given entity type
  const hasRequiredContext = (entityType: 'task' | 'document' | 'hearing') => {
    switch (entityType) {
      case 'task':
        return !!context.caseId; // Tasks require a case
      case 'document':
        return !!context.caseId; // Documents require a case
      case 'hearing':
        return !!context.caseId && !!context.courtId; // Hearings require case and court
      default:
        return false;
    }
  };

  // Get form validation errors
  const getContextValidationErrors = (entityType: 'task' | 'document' | 'hearing') => {
    const errors: string[] = [];
    
    if (!context.caseId) errors.push('Case is required');
    
    if (entityType === 'hearing') {
      if (!context.courtId) errors.push('Court is required');
      if (!context.judgeId) errors.push('Judge is required');
    }

    return errors;
  };

  return {
    context,
    updateContext,
    getAvailableClients,
    getAvailableCases,
    getAvailableCourts,
    getAvailableJudges,
    getContextDetails,
    hasRequiredContext,
    getContextValidationErrors
  };
};
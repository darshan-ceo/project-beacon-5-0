// Hook for statutory deadline calculations in case forms
import { useState, useEffect, useCallback, useMemo } from 'react';
import { statutoryDeadlineService, DeadlineCalculationResult } from '@/services/statutoryDeadlineService';
import { statutoryEventTypesService } from '@/services/statutoryEventTypesService';
import { StatutoryEventType, CaseStatutoryDeadline } from '@/types/statutory';
import { format, parseISO, addDays } from 'date-fns';

interface UseStatutoryDeadlinesOptions {
  caseId?: string;
  noticeDate?: string;
  noticeType?: string;
  autoCalculate?: boolean;
}

interface UseStatutoryDeadlinesReturn {
  // Calculated deadline
  replyDeadline: DeadlineCalculationResult | null;
  isCalculating: boolean;
  
  // Event types for selection
  eventTypes: StatutoryEventType[];
  loadingEventTypes: boolean;
  
  // Case deadlines
  caseDeadlines: CaseStatutoryDeadline[];
  loadingCaseDeadlines: boolean;
  
  // Actions
  calculateReplyDeadline: (noticeDate: string, noticeType?: string) => Promise<DeadlineCalculationResult | null>;
  refreshEventTypes: () => Promise<void>;
  refreshCaseDeadlines: () => Promise<void>;
  
  // Helpers
  formatDeadlineForForm: (deadline: Date | DeadlineCalculationResult | null) => string;
  getDeadlineStatus: (deadline: string) => { status: string; color: string; daysRemaining: number };
}

export function useStatutoryDeadlines(options: UseStatutoryDeadlinesOptions = {}): UseStatutoryDeadlinesReturn {
  const { caseId, noticeDate, noticeType, autoCalculate = true } = options;

  // State
  const [replyDeadline, setReplyDeadline] = useState<DeadlineCalculationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [eventTypes, setEventTypes] = useState<StatutoryEventType[]>([]);
  const [loadingEventTypes, setLoadingEventTypes] = useState(false);
  const [caseDeadlines, setCaseDeadlines] = useState<CaseStatutoryDeadline[]>([]);
  const [loadingCaseDeadlines, setLoadingCaseDeadlines] = useState(false);

  // Load event types
  const refreshEventTypes = useCallback(async () => {
    setLoadingEventTypes(true);
    try {
      const types = await statutoryEventTypesService.getActiveForDeadlineCalc();
      setEventTypes(types);
    } catch (error) {
      console.error('[useStatutoryDeadlines] Error loading event types:', error);
    } finally {
      setLoadingEventTypes(false);
    }
  }, []);

  // Load case deadlines
  const refreshCaseDeadlines = useCallback(async () => {
    if (!caseId) return;
    
    setLoadingCaseDeadlines(true);
    try {
      const deadlines = await statutoryDeadlineService.getDeadlinesForCase(caseId);
      setCaseDeadlines(deadlines);
    } catch (error) {
      console.error('[useStatutoryDeadlines] Error loading case deadlines:', error);
    } finally {
      setLoadingCaseDeadlines(false);
    }
  }, [caseId]);

  // Calculate reply deadline
  const calculateReplyDeadline = useCallback(async (
    noticeDateStr: string,
    noticeTypeStr?: string
  ): Promise<DeadlineCalculationResult | null> => {
    if (!noticeDateStr) return null;
    
    setIsCalculating(true);
    try {
      const result = await statutoryDeadlineService.calculateReplyDeadline(noticeDateStr, noticeTypeStr);
      setReplyDeadline(result);
      return result;
    } catch (error) {
      console.error('[useStatutoryDeadlines] Error calculating deadline:', error);
      return null;
    } finally {
      setIsCalculating(false);
    }
  }, []);

  // Auto-calculate when notice date changes
  useEffect(() => {
    if (autoCalculate && noticeDate) {
      calculateReplyDeadline(noticeDate, noticeType);
    }
  }, [noticeDate, noticeType, autoCalculate, calculateReplyDeadline]);

  // Load event types on mount
  useEffect(() => {
    refreshEventTypes();
  }, [refreshEventTypes]);

  // Load case deadlines when caseId is available
  useEffect(() => {
    if (caseId) {
      refreshCaseDeadlines();
    }
  }, [caseId, refreshCaseDeadlines]);

  // Format deadline for form input
  const formatDeadlineForForm = useCallback((
    deadline: Date | DeadlineCalculationResult | null
  ): string => {
    if (!deadline) return '';
    
    if (deadline instanceof Date) {
      return format(deadline, 'yyyy-MM-dd');
    }
    
    return format(deadline.calculatedDeadline, 'yyyy-MM-dd');
  }, []);

  // Get deadline status
  const getDeadlineStatus = useCallback((deadlineStr: string): {
    status: string;
    color: string;
    daysRemaining: number;
  } => {
    if (!deadlineStr) {
      return { status: 'unknown', color: 'gray', daysRemaining: 0 };
    }

    const deadline = parseISO(deadlineStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const diffTime = deadline.getTime() - today.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysRemaining < 0) {
      return { status: 'Overdue', color: 'red', daysRemaining };
    }
    if (daysRemaining <= 7) {
      return { status: 'Critical', color: 'red', daysRemaining };
    }
    if (daysRemaining <= 15) {
      return { status: 'Warning', color: 'orange', daysRemaining };
    }
    return { status: 'Safe', color: 'green', daysRemaining };
  }, []);

  return {
    replyDeadline,
    isCalculating,
    eventTypes,
    loadingEventTypes,
    caseDeadlines,
    loadingCaseDeadlines,
    calculateReplyDeadline,
    refreshEventTypes,
    refreshCaseDeadlines,
    formatDeadlineForForm,
    getDeadlineStatus
  };
}

// Simple hook for deadline status color
export function useDeadlineStatus(deadline: string | null | undefined): {
  status: 'overdue' | 'critical' | 'warning' | 'safe' | 'unknown';
  color: 'red' | 'orange' | 'green' | 'gray';
  daysRemaining: number;
  label: string;
} {
  return useMemo(() => {
    if (!deadline) {
      return { status: 'unknown', color: 'gray', daysRemaining: 0, label: 'No deadline' };
    }

    const deadlineDate = parseISO(deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const diffTime = deadlineDate.getTime() - today.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysRemaining < 0) {
      return {
        status: 'overdue',
        color: 'red',
        daysRemaining,
        label: `${Math.abs(daysRemaining)} days overdue`
      };
    }
    if (daysRemaining === 0) {
      return { status: 'critical', color: 'red', daysRemaining, label: 'Due today' };
    }
    if (daysRemaining <= 7) {
      return { status: 'critical', color: 'red', daysRemaining, label: `${daysRemaining} days left` };
    }
    if (daysRemaining <= 15) {
      return { status: 'warning', color: 'orange', daysRemaining, label: `${daysRemaining} days left` };
    }
    return { status: 'safe', color: 'green', daysRemaining, label: `${daysRemaining} days left` };
  }, [deadline]);
}

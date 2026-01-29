// Hook for statutory deadline calculations in case forms
import { useState, useEffect, useCallback, useMemo } from 'react';
import { statutoryDeadlineService, DeadlineCalculationResult } from '@/services/statutoryDeadlineService';
import { statutoryEventTypesService } from '@/services/statutoryEventTypesService';
import { StatutoryEventType, CaseStatutoryDeadline } from '@/types/statutory';
import { format, parseISO, addDays } from 'date-fns';

interface UseStatutoryDeadlinesOptions {
  caseId?: string;
  noticeDate?: string;       // For Assessment stage (SCN replies)
  orderDate?: string;        // For Appeal stages (triggers appeal deadline)
  noticeType?: string;
  currentStage?: string;     // Current case stage
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
  calculateAppealDeadline: (orderDate: string, currentStage: string) => Promise<DeadlineCalculationResult | null>;
  refreshEventTypes: () => Promise<void>;
  refreshCaseDeadlines: () => Promise<void>;
  
  // Helpers
  formatDeadlineForForm: (deadline: Date | DeadlineCalculationResult | null) => string;
  getDeadlineStatus: (deadline: string) => { status: string; color: string; daysRemaining: number };
  
  // Appeal stage to event code mapping
  getAppealEventCode: (stage: string) => string | null;
}

export function useStatutoryDeadlines(options: UseStatutoryDeadlinesOptions = {}): UseStatutoryDeadlinesReturn {
  const { caseId, noticeDate, orderDate, noticeType, currentStage, autoCalculate = true } = options;

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

  // Stage to statutory event code mapping for appeals
  const getAppealEventCode = useCallback((stage: string): string | null => {
    const stageEventMap: Record<string, string> = {
      'Adjudication': 'GST-APPEAL-1',       // 3 months from order
      'First Appeal': 'GST-TRIBUNAL-APPEAL', // 3 months from appellate order
      'Tribunal': 'HC-WRIT',                 // 180 days from tribunal order
      'High Court': 'SC-SLP'                 // 30 days from HC order
    };
    return stageEventMap[stage] || null;
  }, []);

  // Calculate appeal deadline based on order date and current stage
  const calculateAppealDeadline = useCallback(async (
    orderDateStr: string,
    stage: string
  ): Promise<DeadlineCalculationResult | null> => {
    if (!orderDateStr || !stage) return null;
    
    const eventCode = getAppealEventCode(stage);
    if (!eventCode) {
      console.warn(`[useStatutoryDeadlines] No event code mapping for stage: ${stage}`);
      return null;
    }
    
    setIsCalculating(true);
    try {
      // Find the event type for deadline calculation
      const eventType = eventTypes.find(et => et.code === eventCode);
      if (!eventType) {
        console.warn(`[useStatutoryDeadlines] Event type not found for code: ${eventCode}`);
        // Fallback: Use calculateReplyDeadline with eventCode as noticeType
        const result = await statutoryDeadlineService.calculateReplyDeadline(orderDateStr, eventCode);
        return result;
      }
      
      // Parse the order date and use it for calculation
      const baseDate = parseISO(orderDateStr);
      const calculatedDeadline = eventType.deadlineType === 'months' 
        ? addDays(baseDate, eventType.deadlineCount * 30) // Approximate months as 30 days
        : addDays(baseDate, eventType.deadlineCount);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const daysRemaining = Math.ceil((calculatedDeadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      let status: 'safe' | 'warning' | 'critical' | 'overdue';
      let statusColor: 'green' | 'orange' | 'red';
      
      if (daysRemaining < 0) {
        status = 'overdue';
        statusColor = 'red';
      } else if (daysRemaining <= 7) {
        status = 'critical';
        statusColor = 'red';
      } else if (daysRemaining <= 15) {
        status = 'warning';
        statusColor = 'orange';
      } else {
        status = 'safe';
        statusColor = 'green';
      }
      
      return {
        calculatedDeadline,
        daysRemaining,
        status,
        statusColor,
        eventType
      };
    } catch (error) {
      console.error('[useStatutoryDeadlines] Error calculating appeal deadline:', error);
      return null;
    } finally {
      setIsCalculating(false);
    }
  }, [eventTypes, getAppealEventCode]);

  // Auto-calculate when notice date changes (for Assessment stage)
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
    calculateAppealDeadline,
    refreshEventTypes,
    refreshCaseDeadlines,
    formatDeadlineForForm,
    getDeadlineStatus,
    getAppealEventCode
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

/**
 * Hook for managing Stage Workflow state
 * Provides reactive state management for the micro-workflow within stages
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { StageWorkflowState, WorkflowStepKey, StageNotice, StageReply } from '@/types/stageWorkflow';
import { stageWorkflowService } from '@/services/stageWorkflowService';
import { stageNoticesService } from '@/services/stageNoticesService';
import { stageRepliesService } from '@/services/stageRepliesService';
import { featureFlagService } from '@/services/featureFlagService';
import { supabase } from '@/integrations/supabase/client';

interface UseStageWorkflowOptions {
  stageInstanceId: string | null;
  caseId: string;
  stageKey: string;
  enabled?: boolean;
}

interface UseStageWorkflowReturn {
  // State
  workflowState: StageWorkflowState | null;
  isLoading: boolean;
  error: string | null;
  
  // Selected step for expanded panel
  activeStep: WorkflowStepKey | null;
  setActiveStep: (step: WorkflowStepKey | null) => void;
  
  // Replies for a specific notice
  noticeReplies: Map<string, StageReply[]>;
  
  // Actions
  refresh: () => Promise<void>;
  
  // Notice actions
  addNotice: (data: Parameters<typeof stageNoticesService.createNotice>[0]) => Promise<StageNotice | null>;
  updateNotice: (id: string, data: Parameters<typeof stageNoticesService.updateNotice>[1]) => Promise<StageNotice | null>;
  deleteNotice: (id: string) => Promise<boolean>;
  
  // Reply actions
  loadRepliesForNotice: (noticeId: string) => Promise<void>;
  addReply: (data: Parameters<typeof stageRepliesService.createReply>[0]) => Promise<StageReply | null>;
  updateReply: (id: string, data: Parameters<typeof stageRepliesService.updateReply>[1]) => Promise<StageReply | null>;
  deleteReply: (id: string) => Promise<boolean>;
  
  // Step actions
  completeStep: (stepKey: WorkflowStepKey) => Promise<boolean>;
  skipStep: (stepKey: WorkflowStepKey, reason: string) => Promise<boolean>;
  
  // Feature flag
  isFeatureEnabled: boolean;
}

export function useStageWorkflow({
  stageInstanceId: externalStageInstanceId,
  caseId,
  stageKey,
  enabled = true
}: UseStageWorkflowOptions): UseStageWorkflowReturn {
  const [resolvedInstanceId, setResolvedInstanceId] = useState<string | null>(externalStageInstanceId);
  const [workflowState, setWorkflowState] = useState<StageWorkflowState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<WorkflowStepKey | null>(null);
  const [noticeReplies, setNoticeReplies] = useState<Map<string, StageReply[]>>(new Map());
  const resolveAttempted = useRef(false);
  
  const isFeatureEnabled = featureFlagService.isEnabled('stage_workflow_v1');

  // Clear state when stage instance changes to prevent cross-stage data bleed
  useEffect(() => {
    setWorkflowState(null);
    setActiveStep(null);
    setNoticeReplies(new Map());
    resolveAttempted.current = false;
  }, [externalStageInstanceId]);

  // Auto-resolve stageInstanceId from caseId if missing
  useEffect(() => {
    if (externalStageInstanceId) {
      setResolvedInstanceId(externalStageInstanceId);
      return;
    }
    if (!caseId || !enabled || !isFeatureEnabled || resolveAttempted.current) return;
    resolveAttempted.current = true;

    (async () => {
      try {
        // Query for active stage instance
        const { data } = await supabase
          .from('stage_instances')
          .select('id')
          .eq('case_id', caseId)
          .eq('status', 'Active')
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) {
          setResolvedInstanceId(data.id);
        } else {
          // Fallback: create one (belt-and-suspenders)
          const { data: { user } } = await supabase.auth.getUser();
          const { data: profile } = await supabase
            .from('profiles')
            .select('tenant_id')
            .eq('id', user?.id || '')
            .maybeSingle();

          if (profile) {
            const { data: newInstance } = await supabase
              .from('stage_instances')
              .insert({
                tenant_id: profile.tenant_id,
                case_id: caseId,
                stage_key: stageKey || 'Assessment',
                cycle_no: 1,
                started_at: new Date().toISOString(),
                status: 'Active',
                created_by: user?.id || null
              })
              .select('id')
              .maybeSingle();
            if (newInstance) setResolvedInstanceId(newInstance.id);
          }
        }
      } catch (err) {
        console.error('[useStageWorkflow] Failed to resolve stage instance:', err);
      }
    })();
  }, [externalStageInstanceId, caseId, enabled, isFeatureEnabled, stageKey]);

  // Load workflow state
  const refresh = useCallback(async () => {
    if (!resolvedInstanceId || !enabled || !isFeatureEnabled) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const state = await stageWorkflowService.getWorkflowState(resolvedInstanceId, caseId, stageKey);
      setWorkflowState(state);
      
      // Auto-open current step if none selected
      if (!activeStep && state.currentStep) {
        setActiveStep(state.currentStep);
      }

      // Auto-load replies for all notices so the Reply panel has data immediately
      if (state.notices && state.notices.length > 0) {
        const replyPromises = state.notices.map(n => 
          stageRepliesService.getRepliesByNotice(n.id).then(replies => ({ noticeId: n.id, replies }))
        );
        const allReplies = await Promise.all(replyPromises);
        setNoticeReplies(prev => {
          const newMap = new Map(prev);
          allReplies.forEach(({ noticeId, replies }) => newMap.set(noticeId, replies));
          return newMap;
        });
      }
    } catch (err) {
      console.error('[useStageWorkflow] Failed to load workflow:', err);
      setError('Failed to load workflow state');
    } finally {
      setIsLoading(false);
    }
  }, [resolvedInstanceId, caseId, stageKey, enabled, isFeatureEnabled, activeStep]);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Load replies for a specific notice
  const loadRepliesForNotice = useCallback(async (noticeId: string) => {
    try {
      const replies = await stageRepliesService.getRepliesByNotice(noticeId);
      setNoticeReplies(prev => new Map(prev).set(noticeId, replies));
    } catch (err) {
      console.error('[useStageWorkflow] Failed to load replies:', err);
    }
  }, []);

  // Notice actions
  const addNotice = useCallback(async (data: Parameters<typeof stageNoticesService.createNotice>[0]) => {
    const notice = await stageNoticesService.createNotice({
      ...data,
      stage_instance_id: resolvedInstanceId || undefined
    });
    if (notice) {
      await refresh();
    }
    return notice;
  }, [resolvedInstanceId, refresh]);

  const updateNotice = useCallback(async (id: string, data: Parameters<typeof stageNoticesService.updateNotice>[1]) => {
    const notice = await stageNoticesService.updateNotice(id, data);
    if (notice) {
      await refresh();
    }
    return notice;
  }, [refresh]);

  const deleteNotice = useCallback(async (id: string) => {
    const success = await stageNoticesService.deleteNotice(id);
    if (success) {
      await refresh();
    }
    return success;
  }, [refresh]);

  // Reply actions
  const addReply = useCallback(async (data: Parameters<typeof stageRepliesService.createReply>[0]) => {
    const reply = await stageRepliesService.createReply({
      ...data,
      stage_instance_id: resolvedInstanceId || undefined
    });
    if (reply) {
      await loadRepliesForNotice(data.notice_id);
      await refresh();
    }
    return reply;
  }, [resolvedInstanceId, refresh, loadRepliesForNotice]);

  const updateReply = useCallback(async (id: string, data: Parameters<typeof stageRepliesService.updateReply>[1]) => {
    const reply = await stageRepliesService.updateReply(id, data);
    if (reply) {
      await refresh();
    }
    return reply;
  }, [refresh]);

  const deleteReply = useCallback(async (id: string) => {
    const success = await stageRepliesService.deleteReply(id);
    if (success) {
      await refresh();
    }
    return success;
  }, [refresh]);

  // Step actions
  const completeStep = useCallback(async (stepKey: WorkflowStepKey) => {
    if (!resolvedInstanceId) return false;
    const success = await stageWorkflowService.completeStep(resolvedInstanceId, stepKey);
    if (success) {
      await refresh();
    }
    return success;
  }, [resolvedInstanceId, refresh]);

  const skipStep = useCallback(async (stepKey: WorkflowStepKey, reason: string) => {
    if (!resolvedInstanceId) return false;
    const success = await stageWorkflowService.skipStep(resolvedInstanceId, stepKey, reason);
    if (success) {
      await refresh();
    }
    return success;
  }, [resolvedInstanceId, refresh]);

  return {
    workflowState,
    isLoading,
    error,
    activeStep,
    setActiveStep,
    noticeReplies,
    refresh,
    addNotice,
    updateNotice,
    deleteNotice,
    loadRepliesForNotice,
    addReply,
    updateReply,
    deleteReply,
    completeStep,
    skipStep,
    isFeatureEnabled
  };
}

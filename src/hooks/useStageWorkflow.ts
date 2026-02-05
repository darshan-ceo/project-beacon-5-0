/**
 * Hook for managing Stage Workflow state
 * Provides reactive state management for the micro-workflow within stages
 */

import { useState, useEffect, useCallback } from 'react';
import { StageWorkflowState, WorkflowStepKey, StageNotice, StageReply } from '@/types/stageWorkflow';
import { stageWorkflowService } from '@/services/stageWorkflowService';
import { stageNoticesService } from '@/services/stageNoticesService';
import { stageRepliesService } from '@/services/stageRepliesService';
import { featureFlagService } from '@/services/featureFlagService';

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
  stageInstanceId,
  caseId,
  stageKey,
  enabled = true
}: UseStageWorkflowOptions): UseStageWorkflowReturn {
  const [workflowState, setWorkflowState] = useState<StageWorkflowState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<WorkflowStepKey | null>(null);
  const [noticeReplies, setNoticeReplies] = useState<Map<string, StageReply[]>>(new Map());
  
  const isFeatureEnabled = featureFlagService.isEnabled('stage_workflow_v1');

  // Load workflow state
  const refresh = useCallback(async () => {
    if (!stageInstanceId || !enabled || !isFeatureEnabled) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const state = await stageWorkflowService.getWorkflowState(stageInstanceId, caseId, stageKey);
      setWorkflowState(state);
      
      // Auto-open current step if none selected
      if (!activeStep && state.currentStep) {
        setActiveStep(state.currentStep);
      }
    } catch (err) {
      console.error('[useStageWorkflow] Failed to load workflow:', err);
      setError('Failed to load workflow state');
    } finally {
      setIsLoading(false);
    }
  }, [stageInstanceId, caseId, stageKey, enabled, isFeatureEnabled, activeStep]);

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
      stage_instance_id: stageInstanceId || undefined
    });
    if (notice) {
      await refresh();
    }
    return notice;
  }, [stageInstanceId, refresh]);

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
      stage_instance_id: stageInstanceId || undefined
    });
    if (reply) {
      await loadRepliesForNotice(data.notice_id);
      await refresh();
    }
    return reply;
  }, [stageInstanceId, refresh, loadRepliesForNotice]);

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
    if (!stageInstanceId) return false;
    const success = await stageWorkflowService.completeStep(stageInstanceId, stepKey);
    if (success) {
      await refresh();
    }
    return success;
  }, [stageInstanceId, refresh]);

  const skipStep = useCallback(async (stepKey: WorkflowStepKey, reason: string) => {
    if (!stageInstanceId) return false;
    const success = await stageWorkflowService.skipStep(stageInstanceId, stepKey, reason);
    if (success) {
      await refresh();
    }
    return success;
  }, [stageInstanceId, refresh]);

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

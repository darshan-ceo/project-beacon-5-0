/**
 * Stage Workflow Service
 * Manages workflow step progress and auto-complete logic
 */

import { supabase } from '@/integrations/supabase/client';
import { 
  StageWorkflowStep, 
  UpdateWorkflowStepInput, 
  WorkflowStepKey, 
  WorkflowStepStatus,
  StageWorkflowState,
  StageWorkflowSummary,
  WorkflowTimelineStep
} from '@/types/stageWorkflow';
import { stageNoticesService } from './stageNoticesService';
import { stageRepliesService } from './stageRepliesService';
import { toast } from '@/hooks/use-toast';

const WORKFLOW_STEPS: WorkflowStepKey[] = ['notices', 'reply', 'hearings', 'closure'];

const STEP_LABELS: Record<WorkflowStepKey, string> = {
  notices: 'Notice(s)',
  reply: 'Reply',
  hearings: 'Hearing(s)',
  closure: 'Stage Closure'
};

const STEP_ICONS: Record<WorkflowStepKey, string> = {
  notices: 'FileText',
  reply: 'Send',
  hearings: 'Calendar',
  closure: 'CheckCircle2'
};

class StageWorkflowService {
  /**
   * Get or initialize workflow steps for a stage instance
   */
  async getWorkflowSteps(stageInstanceId: string): Promise<StageWorkflowStep[]> {
    try {
      const { data, error } = await supabase
        .from('stage_workflow_steps')
        .select(`
          *,
          profiles:completed_by (full_name)
        `)
        .eq('stage_instance_id', stageInstanceId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // If no steps exist, initialize them
      if (!data || data.length === 0) {
        return this.initializeWorkflowSteps(stageInstanceId);
      }

      return data.map(this.mapToWorkflowStep);
    } catch (error) {
      console.error('[StageWorkflowService] Failed to fetch workflow steps:', error);
      return [];
    }
  }

  /**
   * Initialize workflow steps for a new stage instance
   */
  async initializeWorkflowSteps(stageInstanceId: string): Promise<StageWorkflowStep[]> {
    try {
      // Get current user and tenant
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile) throw new Error('User profile not found');

      // Create all 4 workflow steps
      const stepsToInsert = WORKFLOW_STEPS.map(stepKey => ({
        tenant_id: profile.tenant_id,
        stage_instance_id: stageInstanceId,
        step_key: stepKey,
        status: stepKey === 'notices' ? 'In Progress' : 'Pending',
        notes: null
      }));

      const { data, error } = await supabase
        .from('stage_workflow_steps')
        .insert(stepsToInsert)
        .select(`
          *,
          profiles:completed_by (full_name)
        `);

      if (error) throw error;

      return (data || []).map(this.mapToWorkflowStep);
    } catch (error) {
      console.error('[StageWorkflowService] Failed to initialize workflow steps:', error);
      return [];
    }
  }

  /**
   * Update a workflow step status
   */
  async updateStepStatus(
    stageInstanceId: string, 
    stepKey: WorkflowStepKey, 
    input: UpdateWorkflowStepInput
  ): Promise<StageWorkflowStep | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString()
      };

      if (input.status !== undefined) {
        updateData.status = input.status;
        
        if (input.status === 'Completed') {
          updateData.completed_at = new Date().toISOString();
          updateData.completed_by = user?.id || null;
        } else if (input.status === 'Pending' || input.status === 'In Progress') {
          updateData.completed_at = null;
          updateData.completed_by = null;
        }
      }
      
      if (input.notes !== undefined) updateData.notes = input.notes;

      const { data, error } = await supabase
        .from('stage_workflow_steps')
        .update(updateData)
        .eq('stage_instance_id', stageInstanceId)
        .eq('step_key', stepKey)
        .select(`
          *,
          profiles:completed_by (full_name)
        `)
        .single();

      if (error) throw error;

      return this.mapToWorkflowStep(data);
    } catch (error) {
      console.error('[StageWorkflowService] Failed to update step status:', error);
      return null;
    }
  }

  /**
   * Mark a step as completed and advance to next
   */
  async completeStep(stageInstanceId: string, stepKey: WorkflowStepKey): Promise<boolean> {
    try {
      // Mark current step as completed
      await this.updateStepStatus(stageInstanceId, stepKey, { status: 'Completed' });

      // Find and activate next step
      const currentIndex = WORKFLOW_STEPS.indexOf(stepKey);
      if (currentIndex < WORKFLOW_STEPS.length - 1) {
        const nextStep = WORKFLOW_STEPS[currentIndex + 1];
        await this.updateStepStatus(stageInstanceId, nextStep, { status: 'In Progress' });
      }

      // If closure step completed, create stage_transition to advance lifecycle
      if (stepKey === 'closure') {
        await this.handleClosureTransition(stageInstanceId);
      }

      toast({
        title: 'Step Completed',
        description: `${STEP_LABELS[stepKey]} has been marked as completed.`
      });

      return true;
    } catch (error) {
      console.error('[StageWorkflowService] Failed to complete step:', error);
      return false;
    }
  }

  /**
   * Handle lifecycle transition when closure step is completed
   */
  private async handleClosureTransition(stageInstanceId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get stage instance details
      const { data: instance } = await supabase
        .from('stage_instances')
        .select('case_id, stage_key, tenant_id')
        .eq('id', stageInstanceId)
        .maybeSingle();

      if (!instance) return;

      // Determine next stage
      const STAGE_ORDER = ['Assessment', 'Adjudication', 'First Appeal', 'Tribunal', 'High Court', 'Supreme Court'];
      const currentIdx = STAGE_ORDER.indexOf(instance.stage_key);
      const nextStageKey = currentIdx >= 0 && currentIdx < STAGE_ORDER.length - 1 
        ? STAGE_ORDER[currentIdx + 1] 
        : null;

      if (!nextStageKey) return; // Already at Supreme Court, no forward transition

      // Create stage transition (this triggers existing trg_create_stage_instance_on_transition)
      await supabase
        .from('stage_transitions')
        .insert({
          tenant_id: instance.tenant_id,
          case_id: instance.case_id,
          from_stage: instance.stage_key,
          to_stage: nextStageKey,
          transition_type: 'Forward',
          comments: `Stage ${instance.stage_key} workflow completed`,
          created_by: user.id
        });

      // Update case stage_code to reflect new lifecycle stage
      await supabase
        .from('cases')
        .update({ stage_code: nextStageKey })
        .eq('id', instance.case_id);

      console.log(`[StageWorkflowService] Lifecycle transitioned: ${instance.stage_key} → ${nextStageKey}`);
    } catch (error) {
      console.error('[StageWorkflowService] Closure transition failed:', error);
    }
  }

  /**
   * Skip a step and advance to next
   */
  async skipStep(stageInstanceId: string, stepKey: WorkflowStepKey, reason: string): Promise<boolean> {
    try {
      await this.updateStepStatus(stageInstanceId, stepKey, { 
        status: 'Skipped',
        notes: `Skipped: ${reason}`
      });

      // Find and activate next step
      const currentIndex = WORKFLOW_STEPS.indexOf(stepKey);
      if (currentIndex < WORKFLOW_STEPS.length - 1) {
        const nextStep = WORKFLOW_STEPS[currentIndex + 1];
        await this.updateStepStatus(stageInstanceId, nextStep, { status: 'In Progress' });
      }

      toast({
        title: 'Step Skipped',
        description: `${STEP_LABELS[stepKey]} has been skipped.`
      });

      return true;
    } catch (error) {
      console.error('[StageWorkflowService] Failed to skip step:', error);
      return false;
    }
  }

  /**
   * Get complete workflow state for a stage instance
   */
  async getWorkflowState(stageInstanceId: string, caseId: string, stageKey: string): Promise<StageWorkflowState> {
    try {
      // Fetch all data in parallel
      const [rawSteps, notices, hearingsCount] = await Promise.all([
        this.getWorkflowSteps(stageInstanceId),
        stageNoticesService.getNoticesByStageInstance(stageInstanceId),
        this.getHearingsCount(stageInstanceId, caseId)
      ]);

      // Get replies count
      const repliesCount = notices.length > 0 
        ? await stageRepliesService.getRepliesCountByCase(caseId)
        : 0;

      // Determine current step
      const currentStep = this.determineCurrentStep(rawSteps);

      // Calculate overall progress
      const completedSteps = rawSteps.filter(s => s.status === 'Completed' || s.status === 'Skipped').length;
      const overallProgress = Math.round((completedSteps / WORKFLOW_STEPS.length) * 100);

      // Build timeline steps for display
      const steps = this.buildTimelineSteps(rawSteps, notices.length, repliesCount, hearingsCount);

      // Determine closure eligibility
      const canCloseResult = this.checkCanClose(rawSteps, notices);

      return {
        stageInstanceId,
        stageKey,
        caseId,
        steps,
        rawSteps,
        notices,
        replies: [], // Loaded on-demand per notice
        hearingsCount,
        currentStep,
        overallProgress,
        canClose: canCloseResult.canClose,
        blockingReasons: canCloseResult.blockingReasons,
        isLoading: false,
        error: null
      };
    } catch (error) {
      console.error('[StageWorkflowService] Failed to get workflow state:', error);
      return {
        stageInstanceId,
        stageKey,
        caseId,
        steps: [],
        rawSteps: [],
        notices: [],
        replies: [],
        hearingsCount: 0,
        currentStep: 'notices',
        overallProgress: 0,
        canClose: false,
        blockingReasons: ['Failed to load workflow state'],
        isLoading: false,
        error: 'Failed to load workflow state'
      };
    }
  }

  /**
   * Check if stage can be closed
   */
  private checkCanClose(steps: StageWorkflowStep[], notices: any[]): { canClose: boolean; blockingReasons: string[] } {
    const blockingReasons: string[] = [];

    // Check if there are any notices
    if (notices.length === 0) {
      blockingReasons.push('At least one notice must be recorded');
    }

    // Check if there are any pending replies
    const pendingNotices = notices.filter(n => n.status === 'Received' || n.status === 'Reply Pending');
    if (pendingNotices.length > 0) {
      blockingReasons.push(`${pendingNotices.length} notice(s) require a reply`);
    }

    // Check if closure step is available (all prior steps should be done or skipped)
    const closureStep = steps.find(s => s.step_key === 'closure');
    const nonClosureSteps = steps.filter(s => s.step_key !== 'closure');
    const incompletePriorSteps = nonClosureSteps.filter(s => s.status === 'Pending' || s.status === 'In Progress');
    
    if (incompletePriorSteps.length > 0 && closureStep?.status === 'Pending') {
      // Allow closure if at least notices step is done
      const noticesStep = steps.find(s => s.step_key === 'notices');
      if (noticesStep?.status !== 'Completed' && noticesStep?.status !== 'Skipped') {
        blockingReasons.push('Complete or skip preceding workflow steps first');
      }
    }

    return {
      canClose: blockingReasons.length === 0,
      blockingReasons
    };
  }

  /**
   * Get workflow summary for a stage instance
   */
  async getWorkflowSummary(stageInstanceId: string, caseId: string): Promise<StageWorkflowSummary> {
    try {
      const [steps, notices, hearingsCount] = await Promise.all([
        this.getWorkflowSteps(stageInstanceId),
        stageNoticesService.getNoticesByStageInstance(stageInstanceId),
        this.getHearingsCount(stageInstanceId, caseId)
      ]);

      const repliesCount = notices.length > 0 
        ? await stageRepliesService.getRepliesCountByCase(caseId)
        : 0;

      const completedSteps = steps.filter(s => s.status === 'Completed' || s.status === 'Skipped').length;
      const currentStep = this.determineCurrentStep(steps);

      // Get last activity timestamp
      const lastActivity = steps
        .filter(s => s.completed_at)
        .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())[0]?.completed_at;

      return {
        stageInstanceId,
        noticesCount: notices.length,
        repliesCount,
        hearingsCount,
        stepsCompleted: completedSteps,
        stepsTotal: WORKFLOW_STEPS.length,
        currentStep,
        lastActivity
      };
    } catch (error) {
      console.error('[StageWorkflowService] Failed to get workflow summary:', error);
      return {
        stageInstanceId,
        noticesCount: 0,
        repliesCount: 0,
        hearingsCount: 0,
        stepsCompleted: 0,
        stepsTotal: WORKFLOW_STEPS.length,
        currentStep: 'notices'
      };
    }
  }

  /**
   * Build timeline steps for display
   */
  buildTimelineSteps(steps: StageWorkflowStep[], noticesCount: number, repliesCount: number, hearingsCount: number): WorkflowTimelineStep[] {
    return WORKFLOW_STEPS.map(key => {
      const step = steps.find(s => s.step_key === key);
      
      let count: number | undefined;
      let subtitle: string | undefined;

      switch (key) {
        case 'notices':
          count = noticesCount;
          subtitle = noticesCount === 1 ? '1 notice' : `${noticesCount} notices`;
          break;
        case 'reply':
          count = repliesCount;
          subtitle = repliesCount === 1 ? '1 filed' : `${repliesCount} filed`;
          break;
        case 'hearings':
          count = hearingsCount;
          subtitle = hearingsCount === 1 ? '1 scheduled' : `${hearingsCount} scheduled`;
          break;
        case 'closure':
          subtitle = step?.status === 'Completed' ? 'Closed' : 'Pending';
          break;
      }

      return {
        key,
        label: STEP_LABELS[key],
        icon: STEP_ICONS[key],
        status: (step?.status || 'Pending') as WorkflowStepStatus,
        count,
        subtitle,
        isClickable: true
      };
    });
  }

  /**
   * Get hearings count for a stage instance or case
   */
  private async getHearingsCount(stageInstanceId: string, caseId: string): Promise<number> {
    try {
      // First try to count by stage_instance_id
      let { count, error } = await supabase
        .from('hearings')
        .select('*', { count: 'exact', head: true })
        .eq('stage_instance_id', stageInstanceId);

      if (error) throw error;

      // If no hearings linked to stage, fall back to case-level count
      if (count === 0) {
        const result = await supabase
          .from('hearings')
          .select('*', { count: 'exact', head: true })
          .eq('case_id', caseId)
          .is('stage_instance_id', null);

        count = result.count;
      }

      return count || 0;
    } catch (error) {
      console.error('[StageWorkflowService] Failed to count hearings:', error);
      return 0;
    }
  }

  /**
   * Determine current active step
   */
  private determineCurrentStep(steps: StageWorkflowStep[]): WorkflowStepKey {
    // Find first step that is 'In Progress'
    const inProgressStep = steps.find(s => s.status === 'In Progress');
    if (inProgressStep) return inProgressStep.step_key as WorkflowStepKey;

    // Find first step that is 'Pending' 
    const pendingStep = steps.find(s => s.status === 'Pending');
    if (pendingStep) return pendingStep.step_key as WorkflowStepKey;

    // All steps completed - return closure
    return 'closure';
  }

  /**
   * Map database row to WorkflowStep type
   */
  private mapToWorkflowStep(row: any): StageWorkflowStep {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      stage_instance_id: row.stage_instance_id,
      step_key: row.step_key as WorkflowStepKey,
      status: row.status as WorkflowStepStatus,
      completed_at: row.completed_at,
      completed_by: row.completed_by,
      completed_by_name: row.profiles?.full_name || null,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}

export const stageWorkflowService = new StageWorkflowService();

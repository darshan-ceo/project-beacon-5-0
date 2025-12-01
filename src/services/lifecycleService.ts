/**
 * Lifecycle Service for Cyclic Stage Management
 * Handles stage instances, transitions, and validation
 */

import { StageInstance, StageTransition, ChecklistItem, TransitionType, OrderDetails, LifecycleState } from '@/types/lifecycle';
import { stageTransitionService } from './stageTransitionService';
import { taskBundleTriggerService } from './taskBundleTriggerService';
import { GSTStage } from '../../config/appConfig';
import { CASE_STAGES, getNextStage, normalizeStage } from '@/utils/stageUtils';
import { toast } from '@/hooks/use-toast';
import React from 'react';

// Phase 2: GST Lifecycle Stages for Production
const GST_LIFECYCLE_STAGES = [
  { id: 'notice-received', name: 'Notice Received', order: 1 },
  { id: 'reply-filed', name: 'Reply Filed', order: 2 },
  { id: 'hearing-scheduled', name: 'Hearing Scheduled', order: 3 },
  { id: 'submission-done', name: 'Submission Done', order: 4 },
  { id: 'order-passed', name: 'Order Passed', order: 5 },
  { id: 'closed', name: 'Closed', order: 6 }
];

export function initializeGSTLifecycle(caseId: string): Array<{ id: string; name: string; status: 'current' | 'pending' | 'completed' }> {
  return GST_LIFECYCLE_STAGES.map((stage, index) => ({
    id: `${caseId}-stage-${stage.id}`,
    name: stage.name,
    status: index === 0 ? 'current' : 'pending'
  }));
}

export interface CreateTransitionRequest {
  caseId: string;
  type: TransitionType;
  toStageKey: string;
  comments?: string;
  checklistOverrides?: Array<{ itemKey: string; note: string }>;
  orderDetails?: OrderDetails;
  dispatch?: React.Dispatch<any>;
}

class LifecycleService {
  private baseUrl = '/api';

  /**
   * Get complete lifecycle state for a case
   */
  async getLifecycle(caseId: string): Promise<LifecycleState> {
    try {
      // Mock implementation - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const mockCurrentInstance: StageInstance = {
        id: 'si_' + Date.now(),
        caseId,
        stageKey: 'Scrutiny',
        cycleNo: 1,
        startedAt: new Date().toISOString(),
        status: 'Active',
        createdBy: 'current-user',
        createdAt: new Date().toISOString()
      };

      return {
        currentInstance: mockCurrentInstance,
        stageInstances: [mockCurrentInstance],
        transitions: [],
        checklistItems: this.generateMockChecklist(mockCurrentInstance.id),
        isLoading: false
      };
    } catch (error) {
      console.error('Failed to fetch lifecycle:', error);
      throw error;
    }
  }

  /**
   * Create a new stage transition
   */
  async createTransition(request: CreateTransitionRequest): Promise<StageTransition> {
    try {
      // Import supabase dynamically to avoid circular dependencies
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Get user and tenant info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile) throw new Error('User profile not found');

      // Get complete case data including all required fields
      const { data: caseData, error: caseError } = await supabase
        .from('cases')
        .select('stage_code, case_number, client_id, assigned_to, title')
        .eq('id', request.caseId)
        .single();

      if (caseError || !caseData) {
        throw new Error(`Failed to fetch case data: ${caseError?.message || 'Case not found'}`);
      }

      // Save transition to database
      const { data: savedTransition, error: insertError } = await supabase
        .from('stage_transitions')
        .insert({
          tenant_id: profile.tenant_id,
          case_id: request.caseId,
          from_stage: caseData?.stage_code || null,
          to_stage: request.toStageKey,
          transition_type: request.type,
          comments: request.comments || null,
          created_by: user.id
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const transition: StageTransition = {
        id: savedTransition.id,
        caseId: request.caseId,
        toStageInstanceId: 'si_' + Date.now(),
        type: request.type,
        comments: request.comments,
        createdBy: user.id,
        createdAt: new Date().toISOString(),
        ...request.orderDetails && {
          reasonEnum: request.orderDetails.reasonEnum,
          reasonText: request.orderDetails.reasonText,
          orderNo: request.orderDetails.orderNo,
          orderDate: request.orderDetails.orderDate
        }
      };

      // Update case state if dispatch is provided
      if (request.dispatch) {
        const slaStatus = request.toStageKey === 'Adjudication' ? 'Amber' : 
                         request.toStageKey === 'High Court' ? 'Green' : 'Green';

        const oldStage = caseData.stage_code || 'Unknown';
        
        request.dispatch({
          type: 'UPDATE_CASE',
          payload: {
            id: request.caseId,
            currentStage: request.toStageKey as 'Assessment' | 'Adjudication' | 'First Appeal' | 'Tribunal' | 'High Court' | 'Supreme Court',
            slaStatus: slaStatus as 'Green' | 'Amber' | 'Red',
            lastUpdated: new Date().toISOString()
          }
        });

        // Trigger stage transition automation (Templates + Bundles)
        try {
          // Fetch assigned user name for automation
          let assignedToName = 'Unassigned';
          if (caseData.assigned_to) {
            const { data: assignedUser } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', caseData.assigned_to)
              .single();
            assignedToName = assignedUser?.full_name || 'Unknown User';
          }

          // Use real case data for automation
          const automationCaseData = {
            id: request.caseId,
            caseNumber: caseData.case_number,
            clientId: caseData.client_id,
            assignedToId: caseData.assigned_to,
            assignedToName,
            currentStage: request.toStageKey
          };
          
          // Process task templates automation
          const templateResult = await stageTransitionService.processStageTransition(
            automationCaseData,
            oldStage,
            request.toStageKey as GSTStage,
            request.dispatch
          );
          
          // Process task bundles automation
          const bundleResult = await taskBundleTriggerService.triggerTaskBundles(
            automationCaseData,
            'OnStageEnter',
            request.toStageKey as GSTStage,
            request.dispatch
          );
          
          // Combined feedback
          const totalCreated = templateResult.createdTasks.length + bundleResult.totalTasksCreated;
          if (totalCreated > 0) {
            console.log(`[LifecycleService] Stage transition created ${totalCreated} automated tasks (${templateResult.createdTasks.length} from templates, ${bundleResult.totalTasksCreated} from bundles)`);
          }
          
          if (templateResult.suggestedTasks.length > 0) {
            console.log(`[LifecycleService] Stage transition suggests ${templateResult.suggestedTasks.length} tasks`);
            // In real implementation, this would trigger a suggestion drawer
          }
          
        } catch (error) {
          console.error('[LifecycleService] Failed to process stage transition automation:', error);
          // Don't fail the stage transition itself, just log the error
        }
      }

      toast({
        title: "Stage Transition Created",
        description: `Successfully ${request.type?.toLowerCase() || 'moved'} case to ${request.toStageKey}`
      });

      return transition;
    } catch (error) {
      console.error('Failed to create transition:', error);
      throw error;
    }
  }

  /**
   * Attest to a checklist item
   */
  async attestChecklistItem(itemKey: string, note?: string): Promise<ChecklistItem> {
    try {
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const item: ChecklistItem = {
        id: 'cli_' + Date.now(),
        stageInstanceId: 'si_current',
        itemKey,
        label: `Checklist item ${itemKey}`,
        required: true,
        ruleType: 'manual',
        status: 'Attested',
        attestedBy: 'current-user',
        attestedAt: new Date().toISOString(),
        note
      };

      return item;
    } catch (error) {
      console.error('Failed to attest checklist item:', error);
      throw error;
    }
  }

  /**
   * Override a checklist item with justification
   */
  async overrideChecklistItem(itemKey: string, note: string): Promise<ChecklistItem> {
    try {
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const item: ChecklistItem = {
        id: 'cli_' + Date.now(),
        stageInstanceId: 'si_current',
        itemKey,
        label: `Checklist item ${itemKey}`,
        required: true,
        ruleType: 'manual',
        status: 'Override',
        attestedBy: 'current-user',
        attestedAt: new Date().toISOString(),
        note
      };

      return item;
    } catch (error) {
      console.error('Failed to override checklist item:', error);
      throw error;
    }
  }

  /**
   * Validate if transition is allowed based on checklist
   */
  validateTransition(checklistItems: ChecklistItem[], type: TransitionType): {
    isValid: boolean;
    missingItems: string[];
  } {
    if (type !== 'Forward') {
      return { isValid: true, missingItems: [] }; // Send Back/Remand always allowed
    }

    const requiredItems = checklistItems.filter(item => item.required);
    const completedItems = requiredItems.filter(item => 
      ['Auto✓', 'Attested', 'Override'].includes(item.status)
    );

    const missingItems = requiredItems
      .filter(item => !['Auto✓', 'Attested', 'Override'].includes(item.status))
      .map(item => item.label);

    return {
      isValid: completedItems.length === requiredItems.length,
      missingItems
    };
  }

  /**
   * Get available next stages based on transition type
   */
  getAvailableStages(currentStage: string, type: TransitionType): string[] {
    // Normalize the stage to canonical form first
    const canonical = normalizeStage(currentStage);
    const currentIndex = CASE_STAGES.findIndex(s => s === canonical);
    
    // Handle unknown stages
    if (currentIndex === -1) {
      console.warn(`Unknown stage: ${currentStage} (normalized: ${canonical})`);
      return [];
    }

    switch (type) {
      case 'Forward':
        return [...CASE_STAGES.slice(currentIndex + 1)];
      case 'Send Back':
        return [...CASE_STAGES.slice(0, currentIndex)];
      case 'Remand':
        return [canonical]; // Same stage, new cycle
      default:
        return [];
    }
  }

  /**
   * Generate mock checklist for development
   */
  private generateMockChecklist(stageInstanceId: string): ChecklistItem[] {
    return [
      {
        id: 'cli_1',
        stageInstanceId,
        itemKey: 'documents_uploaded',
        label: 'Required documents uploaded',
        required: true,
        ruleType: 'auto_dms',
        status: 'Auto✓'
      },
      {
        id: 'cli_2', 
        stageInstanceId,
        itemKey: 'case_assigned',
        label: 'Case assigned to team member',
        required: true,
        ruleType: 'auto_field',
        status: 'Auto✓'
      },
      {
        id: 'cli_3',
        stageInstanceId,
        itemKey: 'client_verified',
        label: 'Client information verified',
        required: true,
        ruleType: 'manual',
        status: 'Pending'
      },
      {
        id: 'cli_4',
        stageInstanceId,
        itemKey: 'legal_review',
        label: 'Legal review completed',
        required: false,
        ruleType: 'manual',
        status: 'Pending'
      }
    ];
  }
}

export const lifecycleService = new LifecycleService();
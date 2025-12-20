import { AppAction } from '@/contexts/AppStateContext';
import { toast } from '@/hooks/use-toast';

import { Case } from '@/contexts/AppStateContext';
import { normalizeCasePayload } from '@/utils/formatters';
import { lifecycleService } from '@/services/lifecycleService';
import { taskBundleService } from '@/services/taskBundleService';
import { timelineService } from '@/services/timelineService';
import { featureFlagService } from '@/services/featureFlagService';
import { auditService } from '@/services/auditService';
import { supabase } from '@/integrations/supabase/client';

export interface AdvanceStagePayload {
  caseId: string;
  currentStage: string;
  nextStage: string;
  notes?: string;
  assignedTo?: string;
}

const isDev = import.meta.env.DEV;

const log = (level: 'success' | 'error', tab: string, action: string, details?: any) => {
  if (!isDev) return;
  const color = level === 'success' ? 'color: green' : 'color: red';
  console.log(`%c[Cases] ${tab} ${action} ${level}`, color, details);
};

export const casesService = {
  create: async (caseData: Partial<Case>, dispatch: React.Dispatch<AppAction>): Promise<Case> => {
    try {
      // Normalize payload before persistence
      const normalizedData = normalizeCasePayload(caseData);
      
      const { generateId } = await import('@/data/db');
      const newCase: Case = {
        id: generateId(),
        caseNumber: `CAS${Date.now().toString().slice(-6)}`,
        title: normalizedData.title || '',
        clientId: normalizedData.clientId || '',
        currentStage: 'Adjudication',
        priority: normalizedData.priority || 'Medium',
        timelineBreachStatus: 'Green',
        status: 'Active',
        assignedToId: normalizedData.assignedToId || 'emp-1',
        assignedToName: normalizedData.assignedToName || 'John Doe',
        createdDate: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        documents: 0,
        progress: 0,
        generatedForms: [],
        ...normalizedData
      };

      // Dispatch handles persistence via usePersistentDispatch
      dispatch({ type: 'ADD_CASE', payload: newCase });
      log('success', 'Overview', 'create', { caseId: newCase.id, title: newCase.title });
      
      toast({
        title: "Case Created",
        description: `Case ${newCase.caseNumber} has been created successfully.`,
      });

      // Log audit event
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user?.id).single();
        if (user && profile?.tenant_id) {
          await auditService.log('create_case', profile.tenant_id, {
            userId: user.id,
            entityType: 'case',
            entityId: newCase.id,
            details: { caseNumber: newCase.caseNumber, title: newCase.title, clientId: newCase.clientId }
          });
        }
      } catch (auditError) {
        console.warn('Failed to log audit event for case creation:', auditError);
      }

      return newCase;
    } catch (error) {
      log('error', 'Overview', 'create', error);
      toast({
        title: "Error",
        description: "Failed to create case. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  },

  update: async (caseId: string, updates: Partial<Case>, dispatch: React.Dispatch<AppAction>): Promise<void> => {
    try {
      // Normalize payload before persistence
      const normalizedUpdates = normalizeCasePayload(updates);
      const updatedCase = { id: caseId, lastUpdated: new Date().toISOString(), ...normalizedUpdates };
      
      // Dispatch handles persistence via usePersistentDispatch
      dispatch({ type: 'UPDATE_CASE', payload: updatedCase });
      log('success', 'Overview', 'update', { caseId, updates: Object.keys(updates) });
      
      toast({
        title: "Case Updated",
        description: "Case has been updated successfully.",
      });

      // Log audit event
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user?.id).single();
        if (user && profile?.tenant_id) {
          await auditService.log('update_case', profile.tenant_id, {
            userId: user.id,
            entityType: 'case',
            entityId: caseId,
            details: { updatedFields: Object.keys(updates) }
          });
        }
      } catch (auditError) {
        console.warn('Failed to log audit event for case update:', auditError);
      }
    } catch (error) {
      log('error', 'Overview', 'update', error);
      toast({
        title: "Error",
        description: "Failed to update case. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  },

  delete: async (caseId: string, dispatch: React.Dispatch<AppAction>): Promise<void> => {
    try {
      // Dispatch handles persistence via usePersistentDispatch
      dispatch({ type: 'DELETE_CASE', payload: caseId });
      log('success', 'Overview', 'delete', { caseId });
      
      toast({
        title: "Case Deleted",
        description: "Case has been deleted successfully.",
      });

      // Log audit event
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user?.id).single();
        if (user && profile?.tenant_id) {
          await auditService.log('delete_case', profile.tenant_id, {
            userId: user.id,
            entityType: 'case',
            entityId: caseId,
            details: { caseId }
          });
        }
      } catch (auditError) {
        console.warn('Failed to log audit event for case deletion:', auditError);
      }
    } catch (error) {
      log('error', 'Overview', 'delete', error);
      toast({
        title: "Error",
        description: "Failed to delete case. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  },

  advanceStage: async (payload: AdvanceStagePayload, dispatch: React.Dispatch<AppAction>): Promise<void> => {
    try {
      const { caseId, currentStage, nextStage, notes, assignedTo } = payload;
      
      // Create transition through lifecycle service if feature enabled
      if (featureFlagService.isEnabled('lifecycle_cycles_v1')) {
        await lifecycleService.createTransition({
          caseId,
          type: 'Forward',
          toStageKey: nextStage,
          comments: notes,
          dispatch
        });
      }
      
      // Calculate new SLA status based on stage
      const slaStatus = nextStage === 'Adjudication' ? 'Amber' : 
                       nextStage === 'HC' ? 'Green' : 'Green';

      const updates = {
        currentStage: nextStage as 'Assessment' | 'Adjudication' | 'First Appeal' | 'Tribunal' | 'High Court' | 'Supreme Court',
        slaStatus: slaStatus as 'Green' | 'Amber' | 'Red',
        lastUpdated: new Date().toISOString(),
        ...(assignedTo && { assignedToName: assignedTo }),
      };

      // Dispatch handles persistence via usePersistentDispatch
      dispatch({ type: 'UPDATE_CASE', payload: { id: caseId, ...updates } });
      
      // Add timeline entry with proper stage_change type
      try {
        await timelineService.addEntry({
          caseId,
          type: 'stage_change',
          title: `Stage Advanced: ${currentStage} → ${nextStage}`,
          description: notes || `Case automatically advanced from ${currentStage} to ${nextStage}`,
          createdBy: assignedTo || 'System',
          metadata: {
            stage: nextStage,
            previousStage: currentStage
          }
        });
      } catch (timelineError) {
        console.error('Failed to create timeline entry:', timelineError);
        // Don't block stage advancement if timeline fails
      }
      
      // Always trigger task bundles on stage advancement
      try {
        const { taskBundleTriggerService } = await import('./taskBundleTriggerService');
        
        // Get case details for bundle triggering
        const result = await taskBundleTriggerService.triggerTaskBundles(
          { 
            id: caseId, 
            caseNumber: '', 
            clientId: '', 
            assignedToId: '', 
            assignedToName: assignedTo || '', 
            currentStage: nextStage 
          },
          'stage_advance',
          nextStage as any,
          dispatch
        );
        
        console.log('[casesService] Task bundles triggered:', result);
      } catch (bundleError) {
        console.error('[casesService] Failed to trigger task bundles:', bundleError);
        // Don't block stage advancement if bundle triggering fails
      }
      
      // Generate task bundle for new stage (legacy fallback)
      if (nextStage === 'Assessment') {
        dispatch({
          type: 'ADD_TASK', 
          payload: {
            id: `task-${Date.now()}`,
            title: 'Document Verification',
            description: 'Verify all submitted documents for completeness',
            caseId,
            clientId: '',
            caseNumber: '',
            stage: nextStage,
            priority: 'High',
            status: 'Not Started',
            assignedToId: 'emp-1',
            assignedToName: assignedTo || 'John Doe',
            assignedById: 'emp-1',
            assignedByName: 'System',
            createdDate: new Date().toISOString(),
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            estimatedHours: 8,
            isAutoGenerated: true,
            escalationLevel: 0,
            timezone: 'Asia/Kolkata',
            dueDateValidated: true,
            audit_trail: {
              created_by: 'system',
              created_at: new Date().toISOString(),
              updated_by: 'system',
              updated_at: new Date().toISOString(),
              change_log: []
            }
          }
        });
      }

      log('success', 'Lifecycle', 'advanceStage', { caseId, from: payload.currentStage, to: nextStage });
      
      toast({
        title: "Stage Advanced",
        description: `Case moved to ${nextStage} stage successfully.`,
      });

      // Log audit event for stage advancement
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user?.id).single();
        if (user && profile?.tenant_id) {
          await auditService.log('update_case', profile.tenant_id, {
            userId: user.id,
            entityType: 'case',
            entityId: caseId,
            details: { 
              action: 'stage_advance',
              fromStage: payload.currentStage, 
              toStage: nextStage,
              notes: notes
            }
          });
        }
      } catch (auditError) {
        console.warn('Failed to log audit event for stage advancement:', auditError);
      }
    } catch (error) {
      log('error', 'Lifecycle', 'advanceStage', error);
      toast({
        title: "Error",
        description: "Failed to advance stage. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  },

  generateCaseReport: async (caseId: string): Promise<string> => {
    try {
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const reportUrl = `/reports/case-${caseId}-${Date.now()}.pdf`;
      log('success', 'Timeline', 'generateReport', { caseId, reportUrl });
      
      toast({
        title: "Report Generated",
        description: "Case report has been generated successfully.",
      });

      // Simulate file download
      const link = document.createElement('a');
      link.href = `data:text/plain;charset=utf-8,Case Report for ${caseId}\nGenerated: ${new Date().toLocaleString()}`;
      link.download = `case-${caseId}-report.txt`;
      link.click();

      return reportUrl;
    } catch (error) {
      log('error', 'Timeline', 'generateReport', error);
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  },

  exportTimeline: async (caseId: string): Promise<string> => {
    try {
      // Simulate timeline export
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const exportUrl = `/exports/case-timeline-${caseId}-${Date.now()}.csv`;
      log('success', 'Timeline', 'exportTimeline', { caseId, exportUrl });
      
      toast({
        title: "Timeline Exported",
        description: "Case timeline has been exported successfully.",
      });

      // Simulate CSV download
      const csvContent = `Date,Actor,Action,Notes\n${new Date().toLocaleDateString()},System,Case Created,Initial case creation\n${new Date().toLocaleDateString()},User,Stage Advanced,Moved to Scrutiny`;
      const link = document.createElement('a');
      link.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
      link.download = `case-${caseId}-timeline.csv`;
      link.click();

      return exportUrl;
    } catch (error) {
      log('error', 'Timeline', 'exportTimeline', error);
      toast({
        title: "Error",
        description: "Failed to export timeline. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  }
};
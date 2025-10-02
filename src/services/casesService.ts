import { AppAction } from '@/contexts/AppStateContext';
import { toast } from '@/hooks/use-toast';

import { Case } from '@/contexts/AppStateContext';
import { lifecycleService } from '@/services/lifecycleService';
import { taskBundleService } from '@/services/taskBundleService';
import { timelineService } from '@/services/timelineService';
import { featureFlagService } from '@/services/featureFlagService';

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
      // FIXED: Use UUID instead of timestamp
      const { generateId } = await import('@/data/db');
      const newCase: Case = {
        id: generateId(),
        caseNumber: `CAS${Date.now().toString().slice(-6)}`,
        title: caseData.title || '',
        clientId: caseData.clientId || '',
        currentStage: 'Adjudication',
        priority: caseData.priority || 'Medium',
        timelineBreachStatus: 'Green',
        status: 'Active',
        assignedToId: caseData.assignedToId || 'emp-1',
        assignedToName: caseData.assignedToName || 'John Doe',
        createdDate: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        documents: 0,
        progress: 0,
        generatedForms: [],
        ...caseData
      };

      // FIXED: Persist to storage
      const { storageManager } = await import('@/data/StorageManager');
      const { changeTracker } = await import('./changeTracker');
      const { ENTITY_TYPES } = await import('@/constants/StorageKeys');
      
      try {
        const storage = storageManager.getStorage();
        await storage.create('cases', {
          id: newCase.id,
          client_id: newCase.clientId,
          stage_code: newCase.currentStage,
          status: newCase.slaStatus,
          opened_on: new Date(),
          updated_at: new Date(),
          case_number: newCase.caseNumber,
          title: newCase.title,
          assigned_to_id: newCase.assignedToId,
          priority: newCase.priority,
        });

        changeTracker.markDirty(ENTITY_TYPES.CASE, newCase.id, 'create');
        changeTracker.logChange(ENTITY_TYPES.CASE, newCase.id, 'create');
      } catch (storageError) {
        console.error('Failed to persist case to storage:', storageError);
      }

      dispatch({ type: 'ADD_CASE', payload: newCase });
      log('success', 'Overview', 'create', { caseId: newCase.id, title: newCase.title });
      
      toast({
        title: "Case Created",
        description: `Case ${newCase.caseNumber} has been created successfully.`,
      });

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
      const updatedCase = { id: caseId, lastUpdated: new Date().toISOString(), ...updates };
      
      // FIXED: Persist to storage
      const { storageManager } = await import('@/data/StorageManager');
      const { changeTracker } = await import('./changeTracker');
      const { ENTITY_TYPES } = await import('@/constants/StorageKeys');
      
      try {
        const storage = storageManager.getStorage();
        await storage.update('cases', caseId, {
          ...updates,
          updated_at: new Date(),
          client_id: updates.clientId,
          stage_code: updates.currentStage,
          status: updates.slaStatus,
        });

        changeTracker.markDirty(ENTITY_TYPES.CASE, caseId, 'update');
        changeTracker.logChange(ENTITY_TYPES.CASE, caseId, 'update');
      } catch (storageError) {
        console.error('Failed to update case in storage:', storageError);
      }
      
      dispatch({ type: 'UPDATE_CASE', payload: updatedCase });
      log('success', 'Overview', 'update', { caseId, updates: Object.keys(updates) });
      
      toast({
        title: "Case Updated",
        description: "Case has been updated successfully.",
      });
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
      dispatch({ type: 'DELETE_CASE', payload: caseId });
      log('success', 'Overview', 'delete', { caseId });
      
      toast({
        title: "Case Deleted",
        description: "Case has been deleted successfully.",
      });
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
          comments: notes
        });
      }
      
      // Calculate new SLA status based on stage
      const slaStatus = nextStage === 'Adjudication' ? 'Amber' : 
                       nextStage === 'HC' ? 'Green' : 'Green';

      const updates = {
        currentStage: nextStage as 'Scrutiny' | 'Adjudication' | 'First Appeal' | 'Tribunal' | 'High Court' | 'Supreme Court',
        slaStatus: slaStatus as 'Green' | 'Amber' | 'Red',
        lastUpdated: new Date().toISOString(),
        ...(assignedTo && { assignedToName: assignedTo }),
      };

      dispatch({ type: 'UPDATE_CASE', payload: { id: caseId, ...updates } });
      
      // Add timeline entry
      await timelineService.addEntry({
        caseId,
        type: 'case_created',
        title: `Stage Advanced: ${currentStage} → ${nextStage}`,
        description: notes || `Case automatically advanced from ${currentStage} to ${nextStage}`,
        createdBy: assignedTo || 'System'
      });
      
      // Generate task bundle for new stage
      if (nextStage === 'Scrutiny') {
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
            escalationLevel: 0
          }
        });
      }

      log('success', 'Lifecycle', 'advanceStage', { caseId, from: payload.currentStage, to: nextStage });
      
      toast({
        title: "Stage Advanced",
        description: `Case moved to ${nextStage} stage successfully.`,
      });
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
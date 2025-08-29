import { AppAction } from '@/contexts/AppStateContext';
import { toast } from '@/hooks/use-toast';

// Import the Case interface from AppStateContext
interface Case {
  id: string;
  caseNumber: string;
  title: string;
  clientId: string;
  currentStage: 'Scrutiny' | 'Demand' | 'Adjudication' | 'Appeals' | 'GSTAT' | 'HC' | 'SC';
  priority: 'High' | 'Medium' | 'Low';
  slaStatus: 'Green' | 'Amber' | 'Red';
  nextHearing?: {
    date: string;
    courtId: string;
    judgeId: string;
    type: 'Adjourned' | 'Final' | 'Argued';
  };
  assignedToId: string;
  assignedToName: string;
  createdDate: string;
  lastUpdated: string;
  documents: number;
  progress: number;
}

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
      const newCase: Case = {
        id: `case-${Date.now()}`,
        caseNumber: `CAS${Date.now().toString().slice(-6)}`,
        title: caseData.title || '',
        clientId: caseData.clientId || '',
        currentStage: 'Demand',
        priority: caseData.priority || 'Medium',
        slaStatus: 'Green',
        assignedToId: caseData.assignedToId || 'emp-1',
        assignedToName: caseData.assignedToName || 'John Doe',
        createdDate: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        documents: 0,
        progress: 0,
        ...caseData
      };

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
      const { caseId, nextStage, notes, assignedTo } = payload;
      
      // Calculate new SLA status based on stage
      const slaStatus = nextStage === 'Adjudication' ? 'Amber' : 
                       nextStage === 'HC' ? 'Green' : 'Green';

      const updates = {
        currentStage: nextStage as 'Scrutiny' | 'Demand' | 'Adjudication' | 'Appeals' | 'GSTAT' | 'HC' | 'SC',
        slaStatus: slaStatus as 'Green' | 'Amber' | 'Red',
        lastUpdated: new Date().toISOString(),
        ...(assignedTo && { assignedToName: assignedTo }),
      };

      dispatch({ type: 'UPDATE_CASE', payload: { id: caseId, ...updates } });
      
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
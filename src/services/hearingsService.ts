import { AppAction } from '@/contexts/AppStateContext';
import { toast } from '@/hooks/use-toast';

// Use the Hearing interface from AppStateContext
interface Hearing {
  id: string;
  caseId: string;
  clientId: string;
  courtId: string;
  judgeId: string;
  date: string;
  time: string;
  type: 'Adjourned' | 'Final' | 'Argued' | 'Preliminary';
  status: 'Scheduled' | 'Completed' | 'Postponed' | 'Cancelled';
  agenda: string;
  notes?: string;
  createdDate: string;
  lastUpdated: string;
}

const isDev = import.meta.env.DEV;

const log = (level: 'success' | 'error', tab: string, action: string, details?: any) => {
  if (!isDev) return;
  const color = level === 'success' ? 'color: green' : 'color: red';
  console.log(`%c[Cases] ${tab} ${action} ${level}`, color, details);
};

export const hearingsService = {
  create: async (hearingData: Partial<Hearing>, dispatch: React.Dispatch<AppAction>): Promise<Hearing> => {
    try {
      const newHearing: Hearing = {
        id: `hearing-${Date.now()}`,
        caseId: hearingData.caseId || '',
        clientId: hearingData.clientId || '',
        courtId: hearingData.courtId || '',
        judgeId: hearingData.judgeId || '',
        date: hearingData.date || '',
        time: hearingData.time || '',
        type: hearingData.type || 'Preliminary',
        status: 'Scheduled',
        agenda: hearingData.agenda || '',
        notes: hearingData.notes || '',
        createdDate: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        ...hearingData
      };

      dispatch({ type: 'ADD_HEARING', payload: newHearing });
      log('success', 'Hearings', 'create', { hearingId: newHearing.id, caseId: newHearing.caseId });
      
      toast({
        title: "Hearing Scheduled",
        description: `Hearing scheduled for ${hearingData.date} at ${hearingData.time}.`,
      });

      return newHearing;
    } catch (error) {
      log('error', 'Hearings', 'create', error);
      toast({
        title: "Error",
        description: "Failed to schedule hearing. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  },

  update: async (hearingId: string, updates: Partial<Hearing>, dispatch: React.Dispatch<AppAction>): Promise<Partial<Hearing>> => {
    try {
      const updatedHearing = { ...updates, id: hearingId, lastUpdated: new Date().toISOString() };
      dispatch({ type: 'UPDATE_HEARING', payload: updatedHearing });
      log('success', 'Hearings', 'update', { hearingId, updates: Object.keys(updates) });
      
      toast({
        title: "Hearing Updated",
        description: "Hearing has been updated successfully.",
      });

      return updatedHearing;
    } catch (error) {
      log('error', 'Hearings', 'update', error);
      toast({
        title: "Error",
        description: "Failed to update hearing. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  },

  delete: async (hearingId: string, dispatch: React.Dispatch<AppAction>): Promise<void> => {
    try {
      dispatch({ type: 'DELETE_HEARING', payload: hearingId });
      log('success', 'Hearings', 'delete', { hearingId });
      
      toast({
        title: "Hearing Cancelled",
        description: "Hearing has been cancelled successfully.",
      });
    } catch (error) {
      log('error', 'Hearings', 'delete', error);
      toast({
        title: "Error",
        description: "Failed to cancel hearing. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  }
};
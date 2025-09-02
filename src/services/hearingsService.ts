import { AppAction } from '@/contexts/AppStateContext';
import { toast } from '@/hooks/use-toast';
import { calendarService } from './calendar/calendarService';
import { integrationsService } from './integrationsService';

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
  externalEventId?: string;
  syncStatus?: 'synced' | 'not_synced' | 'sync_failed' | 'sync_pending';
  syncError?: string;
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
        syncStatus: 'not_synced',
        ...hearingData
      };

      // Try calendar sync
      const settings = integrationsService.loadCalendarSettings('default');
      if (settings?.autoSync && settings.provider !== 'none') {
        try {
          const externalEventId = await calendarService.createEvent(newHearing, settings);
          if (externalEventId) {
            newHearing.externalEventId = externalEventId;
            newHearing.syncStatus = 'synced';
          }
        } catch (error) {
          newHearing.syncStatus = 'sync_failed';
          newHearing.syncError = String(error);
        }
      }

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

  update: async (hearingId: string, updates: Partial<Hearing>, dispatch: React.Dispatch<AppAction>): Promise<void> => {
    try {
      const updatedHearing = { id: hearingId, lastUpdated: new Date().toISOString(), ...updates };
      
      // Try calendar sync for updates
      const settings = integrationsService.loadCalendarSettings('default');
      if (settings?.autoSync && settings.provider !== 'none' && updatedHearing.externalEventId) {
        try {
          await calendarService.updateEvent(updatedHearing as Hearing, settings);
          updatedHearing.syncStatus = 'synced';
          updatedHearing.syncError = undefined;
        } catch (error) {
          updatedHearing.syncStatus = 'sync_failed';
          updatedHearing.syncError = String(error);
        }
      }

      dispatch({ type: 'UPDATE_HEARING', payload: updatedHearing });
      log('success', 'Hearings', 'update', { hearingId, updates: Object.keys(updates) });
      
      toast({
        title: "Hearing Updated",
        description: "Hearing has been updated successfully.",
      });
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
      // Try calendar sync for deletion - need to get hearing data first
      const settings = integrationsService.loadCalendarSettings('default');
      // Note: In real implementation, we'd fetch the hearing data first to get externalEventId
      // For now, just proceed with local deletion
      
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
import { AppAction } from '@/contexts/AppStateContext';
import { toast } from '@/hooks/use-toast';
import { Hearing, HearingFormData, HearingFilters, HearingConflict, HearingNotification } from '@/types/hearings';
import { apiService } from './apiService';
import { integrationsService } from './integrationsService';
import { calendarService } from './calendar/calendarService';
import { loadAppState } from '@/data/storageShim';
import { timelineService } from './timelineService';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

const isDev = import.meta.env.DEV;

const log = (level: 'success' | 'error', action: string, details?: any) => {
  if (!isDev) return;
  const color = level === 'success' ? 'color: green' : 'color: red';
  console.log(`%c[Hearings] ${action} ${level}`, color, details);
};

export const hearingsService = {
  /**
   * Fetch hearings with filters and pagination
   */
  async getHearings(filters?: HearingFilters): Promise<Hearing[]> {
    try {
      const params = new URLSearchParams();
      
      if (filters?.dateFrom) params.append('from', filters.dateFrom);
      if (filters?.dateTo) params.append('to', filters.dateTo);
      if (filters?.courts?.length) params.append('courts', filters.courts.join(','));
      if (filters?.judges?.length) params.append('judges', filters.judges.join(','));
      if (filters?.status?.length) params.append('status', filters.status.join(','));
      if (filters?.purpose?.length) params.append('purpose', filters.purpose.join(','));
      
      const response = await apiService.get<Hearing[]>(`/api/hearings?${params.toString()}`);
      
      if (response.success && response.data) {
        // Ensure response.data is actually an array
        const hearingsData = Array.isArray(response.data) ? response.data : [];
        // Normalize hearings to ensure both time and start_time exist for backward compatibility
        const normalizedHearings = hearingsData.map(hearing => ({
          ...hearing,
          time: hearing.time || hearing.start_time || '10:00',
          start_time: hearing.start_time || hearing.time || '10:00'
        }));
        log('success', 'fetch hearings', { count: normalizedHearings.length, filters });
        return normalizedHearings;
      }
      
      // Fallback to mock data
      return this.getMockHearings(filters);
    } catch (error) {
      log('error', 'fetch hearings', error);
      return this.getMockHearings(filters);
    }
  },

  /**
   * Get single hearing by ID
   */
  async getHearing(id: string): Promise<Hearing | null> {
    try {
      const response = await apiService.get<Hearing>(`/api/hearings/${id}`);
      
      if (response.success && response.data) {
        log('success', 'fetch hearing', { id });
        return response.data;
      }
      
      return null;
    } catch (error) {
      log('error', 'fetch hearing', error);
      return null;
    }
  },

  /**
   * Create new hearing
   */
  async createHearing(data: HearingFormData, dispatch: React.Dispatch<AppAction>): Promise<Hearing> {
    try {
      // Import storage manager
      const { storageManager } = await import('@/data/StorageManager');
      const storage = storageManager.getStorage();

      const hearingData = {
        case_id: data.case_id,
        hearing_date: new Date(`${data.date}T${data.start_time || '10:00'}:00`).toISOString(),
        next_hearing_date: null,
        court_name: data.court_id || null,
        judge_name: data.judge_ids?.join(', ') || null,
        status: 'Scheduled',
        notes: data.notes || null,
        outcome: null
      };

      // Persist to Supabase first
      const savedHearing = await storage.create<any>('hearings', hearingData);

      // Convert to app format with backward compatibility
      const newHearing: Hearing = {
        id: savedHearing.id,
        case_id: savedHearing.case_id,
        date: data.date,
        start_time: data.start_time || '10:00',
        time: data.start_time || '10:00', // Legacy field
        end_time: data.end_time || '11:00',
        timezone: data.timezone || 'Asia/Kolkata',
        court_id: data.court_id,
        judge_ids: data.judge_ids || [],
        purpose: data.purpose || 'mention',
        status: 'scheduled',
        notes: savedHearing.notes,
        forum_id: data.forum_id,
        authority_id: data.authority_id,
        created_by: 'current-user-id',
        created_at: savedHearing.created_at || new Date().toISOString(),
        updated_at: savedHearing.updated_at || new Date().toISOString(),
        // Legacy compatibility
        clientId: data.case_id.split('-')[0],
        judgeId: (data.judge_ids || [])[0] || '',
        type: 'Preliminary' as const,
        agenda: data.notes || 'New hearing'
      };

      // Update React context after successful persistence
      dispatch({ type: 'ADD_HEARING', payload: newHearing });
      
      // Add timeline entry
      try {
        const appState = await loadAppState();
        const relatedCase = appState.cases.find(c => c.id === data.case_id);
        if (relatedCase) {
          await timelineService.addEntry({
            caseId: data.case_id,
            type: 'hearing_scheduled',
            title: 'Hearing Scheduled',
            description: `Hearing scheduled for ${format(new Date(data.date), 'dd MMM yyyy')} at ${data.start_time}`,
            createdBy: 'current-user-id',
            metadata: {
              hearingId: newHearing.id,
              hearingDate: data.date,
              startTime: data.start_time,
              authorityId: data.authority_id,
              forumId: data.forum_id,
              court: data.court_id || 'Forum TBD'
            }
          });
        }
      } catch (timelineError) {
        console.error('[Hearings] Failed to add timeline entry:', timelineError);
      }
      
      // Auto-sync to calendar if enabled
      try {
        const settings = integrationsService.loadCalendarSettings('default');
        if (settings?.autoSync && settings.provider !== 'none') {
          const connectionStatus = integrationsService.getConnectionStatus('default', settings.provider);
          
          if (connectionStatus.connected) {
            const eventId = await calendarService.createEvent(newHearing, settings);
            
            if (eventId) {
              newHearing.externalEventId = eventId;
              newHearing.syncStatus = 'synced';
              
              dispatch({ 
                type: 'UPDATE_HEARING', 
                payload: { 
                  id: newHearing.id, 
                  externalEventId: eventId, 
                  syncStatus: 'synced' 
                } 
              });
            }
          }
        }
      } catch (syncError) {
        console.error('Failed to auto-sync hearing to calendar:', syncError);
        newHearing.syncStatus = 'sync_failed';
      }
      
      toast({
        title: "Hearing Scheduled",
        description: `Hearing scheduled for ${data.date} at ${data.start_time}.`,
      });
      
      log('success', 'create hearing', { hearingId: newHearing.id });
      return newHearing;
      
    } catch (error) {
      log('error', 'create hearing failed', error);
      toast({
        title: "Error",
        description: "Failed to schedule hearing. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  },

  /**
   * Update existing hearing
   */
  async updateHearing(id: string, updates: Partial<Hearing>, dispatch: React.Dispatch<AppAction>): Promise<void> {
    try {
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      // Try API call first
      try {
        const response = await apiService.put<Hearing>(`/api/hearings/${id}`, updateData);
        
        if (response.success) {
          const updatedHearing = { id, ...updateData };
          dispatch({ type: 'UPDATE_HEARING', payload: updatedHearing });
          
          toast({
            title: "Hearing Updated",
            description: "Hearing has been updated successfully.",
          });
          
          log('success', 'update hearing', { hearingId: id, updates: Object.keys(updates) });
          return;
        }
      } catch (apiError) {
        log('error', 'API call failed, using offline mode', apiError);
      }

      // Fallback to local update when API fails
      const updatedHearing = { id, ...updateData };
      dispatch({ type: 'UPDATE_HEARING', payload: updatedHearing });
      
      // Phase 2: Add timeline entry for hearing updated
      try {
        const appState = await loadAppState();
        const hearing = appState.hearings.find(h => h.id === id);
        if (hearing) {
          await timelineService.addEntry({
            caseId: hearing.case_id,
            type: 'hearing_scheduled',
            title: 'Hearing Updated',
            description: `Hearing rescheduled to ${updates.date ? format(new Date(updates.date), 'dd MMM yyyy') : 'new date'}${updates.start_time ? ` at ${updates.start_time}` : ''}`,
            createdBy: 'current-user-id',
            metadata: {
              hearingId: id,
              hearingDate: updates.date,
              startTime: updates.start_time,
              changes: Object.keys(updates)
            }
          });
          console.log('[Hearings] Timeline entry added for hearing updated');
        }
      } catch (timelineError) {
        console.error('[Hearings] Failed to add timeline entry:', timelineError);
      }
      
      // Auto-sync calendar update if enabled
      try {
        const settings = integrationsService.loadCalendarSettings('default');
        if (settings?.autoSync && settings.provider !== 'none') {
          const connectionStatus = integrationsService.getConnectionStatus('default', settings.provider);
          
          if (connectionStatus.connected) {
            // Get the full hearing object from state
            const appState = await loadAppState();
            const fullHearing = appState.hearings.find(h => h.id === id) as any;
            
            if (fullHearing && fullHearing.externalEventId) {
              // Update existing event
              await calendarService.updateEvent(fullHearing as any, settings);
              (updatedHearing as any).syncStatus = 'synced';
            } else if (fullHearing && !fullHearing.externalEventId) {
              // Create event if it doesn't exist yet
              const eventId = await calendarService.createEvent(fullHearing as any, settings);
              if (eventId) {
                (updatedHearing as any).externalEventId = eventId;
                (updatedHearing as any).syncStatus = 'synced';
              }
            }
          }
        }
      } catch (syncError) {
        console.error('Failed to auto-sync hearing update to calendar:', syncError);
        (updatedHearing as any).syncStatus = 'sync_failed';
      }
      
      toast({
        title: "Hearing Updated (Offline)",
        description: "Hearing has been updated locally. Will sync when online.",
      });
      
      log('success', 'update hearing (offline)', { hearingId: id, updates: Object.keys(updates) });
      
    } catch (error) {
      log('error', 'update hearing failed completely', error);
      toast({
        title: "Error",
        description: "Failed to update hearing. Please check your connection and try again.",
        variant: "destructive",
      });
      throw error;
    }
  },

  /**
   * Delete hearing
   */
  async deleteHearing(id: string, dispatch: React.Dispatch<AppAction>): Promise<void> {
    try {
      // Get the hearing before deleting to check for calendar sync
      const appState = await loadAppState();
      const hearing = appState.hearings.find(h => h.id === id) as any;
      
      // Delete from calendar if synced
      if (hearing?.externalEventId) {
        try {
          const settings = integrationsService.loadCalendarSettings('default');
          if (settings && settings.provider !== 'none') {
            const connectionStatus = integrationsService.getConnectionStatus('default', settings.provider);
            
            if (connectionStatus.connected) {
              await calendarService.deleteEvent(hearing as any, settings);
              console.log('Calendar event deleted successfully');
            }
          }
        } catch (calendarError) {
          console.error('Failed to delete calendar event:', calendarError);
          // Continue with hearing deletion even if calendar delete fails
        }
      }
      
      const response = await apiService.delete(`/api/hearings/${id}`);
      
      if (response.success) {
        dispatch({ type: 'DELETE_HEARING', payload: id });
        
        toast({
          title: "Hearing Cancelled",
          description: hearing?.externalEventId 
            ? "Hearing and calendar event have been cancelled successfully."
            : "Hearing has been cancelled successfully.",
        });
        
        log('success', 'delete hearing', { hearingId: id });
      } else {
        throw new Error('Failed to delete hearing');
      }
    } catch (error) {
      log('error', 'delete hearing', error);
      toast({
        title: "Error",
        description: "Failed to cancel hearing. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  },

  async recordOutcome(
    id: string, 
    outcome: string, 
    outcomeText?: string, 
    nextHearingDate?: string,
    autoCreateNext: boolean = false,
    dispatch?: React.Dispatch<AppAction>
  ): Promise<Hearing | null> {
    try {
      const updates: any = {
        status: 'concluded' as const,
        outcome,
        outcome_text: outcomeText,
        next_hearing_date: nextHearingDate,
        updated_at: new Date().toISOString()
      };

      // Get the full hearing object before updating
      const appState = await loadAppState();
      const hearing = appState.hearings.find(h => h.id === id) as any;
      
      if (!hearing) {
        throw new Error('Hearing not found');
      }

      const response = await apiService.put<Hearing>(`/api/hearings/${id}`, updates);
      
      if (response.success || import.meta.env.DEV) {
        // Update hearing in state
        if (dispatch) {
          dispatch({ type: 'UPDATE_HEARING', payload: { id, ...updates } });
        }

        // Phase 2: Add timeline entry for outcome
        try {
          await timelineService.addEntry({
            caseId: hearing.case_id || hearing.caseId,
            type: 'hearing_scheduled',
            title: 'Hearing Outcome Recorded',
            description: `Outcome: ${outcome}. ${outcomeText || ''}`,
            createdBy: 'current-user-id',
            metadata: {
              hearingId: id,
              outcome,
              outcomeText,
              nextHearingDate
            }
          });
          console.log('[Hearings] Timeline entry added for outcome');
        } catch (timelineError) {
          console.error('[Hearings] Failed to add timeline entry:', timelineError);
        }

        // Phase 2: Auto-create next hearing if outcome is Adjournment
        if (outcome === 'Adjournment' && autoCreateNext && nextHearingDate && dispatch) {
          try {
            const nextHearingData: HearingFormData = {
              case_id: hearing.case_id || hearing.caseId,
              date: nextHearingDate,
              start_time: hearing.start_time || hearing.time || '10:00',
              end_time: hearing.end_time || '11:00',
              timezone: hearing.timezone || 'Asia/Kolkata',
              court_id: hearing.court_id || hearing.courtId,
              judge_ids: hearing.judge_ids || (hearing.judgeId ? [hearing.judgeId] : []),
              purpose: hearing.purpose || 'mention',
              notes: `Adjourned from ${format(new Date(hearing.date), 'dd MMM yyyy')}. ${outcomeText || ''}`,
              authority_id: hearing.authority_id || hearing.authorityId,
              forum_id: hearing.forum_id || hearing.forumId
            };

            const nextHearing = await this.createHearing(nextHearingData, dispatch);
            
            toast({
              title: "Next Hearing Scheduled",
              description: `Hearing automatically scheduled for ${format(new Date(nextHearingDate), 'dd MMM yyyy')}`,
            });

            console.log('[Hearings] Auto-created next hearing:', nextHearing.id);
            
            return nextHearing as any;
          } catch (createError) {
            console.error('[Hearings] Failed to auto-create next hearing:', createError);
            toast({
              title: "Warning",
              description: "Outcome recorded but failed to auto-create next hearing. Please schedule manually.",
              variant: "default"
            });
          }
        }
        
        toast({
          title: "Outcome Recorded",
          description: `Hearing outcome: ${outcome}`,
        });
        
        log('success', 'record outcome', { hearingId: id, outcome });
        return hearing;
      } else {
        throw new Error('Failed to record outcome');
      }
    } catch (error) {
      log('error', 'record outcome', error);
      toast({
        title: "Error",
        description: "Failed to record hearing outcome. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  },

  /**
   * Upload order file to Supabase Storage
   */
  async uploadOrder(hearingId: string, file: File): Promise<string> {
    try {
      // Generate file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${hearingId}_order_${Date.now()}.${fileExt}`;
      const filePath = `hearings/${hearingId}/${fileName}`;
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);
      
      if (uploadError) {
        console.error('[Hearings] Upload failed:', uploadError);
        throw uploadError;
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);
      
      // Update hearing with file path and URL
      const { error: updateError } = await supabase
        .from('hearings')
        .update({ 
          order_file_path: filePath,
          order_file_url: publicUrl
        })
        .eq('id', hearingId);
      
      if (updateError) {
        console.error('[Hearings] Update hearing failed:', updateError);
        throw updateError;
      }
      
      toast({
        title: "Order Uploaded",
        description: "Order document has been uploaded successfully.",
      });
      
      log('success', 'upload order', { hearingId, filePath, publicUrl });
      return publicUrl;
    } catch (error) {
      log('error', 'upload order', error);
      toast({
        title: "Error",
        description: "Failed to upload order. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  },

  /**
   * Check for hearing conflicts
   */
  async checkConflicts(hearingData: Partial<Hearing>): Promise<HearingConflict[]> {
    try {
      const response = await apiService.post<HearingConflict[]>('/api/hearings/conflicts', hearingData);
      
      if (response.success && response.data) {
        return response.data;
      }
      
      return [];
    } catch (error) {
      log('error', 'check conflicts', error);
      return [];
    }
  },

  /**
   * Send notifications
   */
  async sendNotifications(notification: HearingNotification): Promise<void> {
    try {
      const response = await apiService.post('/api/hearings/notify', notification);
      
      if (response.success) {
        toast({
          title: "Notifications Sent",
          description: "Hearing notifications have been sent successfully.",
        });
        
        log('success', 'send notifications', { hearingId: notification.hearing_id });
      } else {
        throw new Error('Failed to send notifications');
      }
    } catch (error) {
      log('error', 'send notifications', error);
      
      // Development mode fallback - simulate successful notification
      if (import.meta.env.DEV) {
        console.log('Development mode: Simulating notification success', notification);
        toast({
          title: "Notifications Sent",
          description: "Hearing notifications have been sent successfully. (Development mode)",
        });
        log('success', 'send notifications (dev mode)', { hearingId: notification.hearing_id });
        return;
      }
      
      toast({
        title: "Error",
        description: "Failed to send notifications. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  },

  /**
   * Get hearings for specific case
   */
  async getCaseHearings(caseId: string): Promise<Hearing[]> {
    try {
      const response = await apiService.get<Hearing[]>(`/api/cases/${caseId}/hearings`);
      
      if (response.success && response.data) {
        // Ensure response.data is actually an array
        const hearingsData = Array.isArray(response.data) ? response.data : [];
        return hearingsData;
      }
      
      return this.getMockHearings({ cases: [caseId] });
    } catch (error) {
      log('error', 'fetch case hearings', error);
      return this.getMockHearings({ cases: [caseId] });
    }
  },

  /**
   * Get stage summary including hearings
   */
  async getStageContext(caseId: string, stageInstanceId: string): Promise<{
    hearings: { next?: any; last?: any }
  }> {
    try {
      const response = await apiService.get<{ hearings?: { next?: any; last?: any } }>(`/api/cases/${caseId}/stages/${stageInstanceId}/summary`);
      
      if (response.success && response.data && response.data.hearings) {
        return { hearings: response.data.hearings };
      }
      
      return { hearings: { next: null, last: null } };
    } catch (error) {
      log('error', 'fetch stage context', error);
      return { hearings: { next: null, last: null } };
    }
  },

  /**
   * Mock data fallback
   */
  getMockHearings(filters?: HearingFilters): Hearing[] {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);
    const pastDateStr = pastDate.toISOString().split('T')[0];

    const mockHearings: (Hearing & { court?: string; judge?: string; location?: string; reminder?: string })[] = [
      {
        id: 'hearing-001',
        case_id: 'GST-001',
        stage_instance_id: 'stage-inst-001',
        cycle_no: 1,
        date: today,
        start_time: '10:30',
        end_time: '11:30',
        timezone: 'Asia/Kolkata',
        court_id: '1',
        forum_id: '1',
        authority_id: '1',
        authority_name: 'Commissioner of GST, Mumbai Zone',
        forum_name: 'CESTAT Mumbai',
        judge_name: 'Justice R.K. Sharma',
        bench_details: 'Single Member Bench',
        courtroom: 'Court Room 3',
        judge_ids: ['1'],
        purpose: 'final',
        status: 'scheduled',
        notes: 'Bring original assessment order and supporting documents',
        attendance: {
          our_counsel_id: '2',
          opposite_counsel: 'Advocate Kumar',
          client_rep: 'Mr. Sharma (Director)'
        },
        created_by: 'user-001',
        created_at: '2024-02-01T10:00:00Z',
        updated_at: '2024-02-01T10:00:00Z',
        // Legacy compatibility fields for HearingScheduler component
        clientId: '1',
        judgeId: '1',
        time: '10:30',
        type: 'Final',
        agenda: 'Tax Assessment Appeal - Acme Corp',
        court: 'Income Tax Appellate Tribunal',
        judge: 'Justice R.K. Sharma',
        location: 'Court Room 3, ITAT Building',
        reminder: '1 day'
      },
      {
        id: 'hearing-002',
        case_id: 'GST-002',
        date: tomorrowStr,
        start_time: '14:00',
        end_time: '15:00',
        timezone: 'Asia/Kolkata',
        court_id: '2',
        forum_id: '2',
        authority_id: '2',
        authority_name: 'Commissioner of GST, Delhi Zone',
        forum_name: 'High Court Delhi',
        judge_name: 'Hon\'ble Chief Justice',
        bench_details: 'Division Bench',
        judge_ids: ['2'],
        purpose: 'mention',
        status: 'scheduled',
        created_by: 'user-001',
        created_at: '2024-02-01T10:00:00Z',
        updated_at: '2024-02-28T15:00:00Z',
        // Legacy compatibility fields for HearingScheduler component
        clientId: '3',
        judgeId: '2',
        time: '14:00',
        type: 'Argued',
        agenda: 'Supreme Court Constitutional Matter',
        court: 'Supreme Court of India',
        judge: 'Hon\'ble Chief Justice',
        location: 'Court Room 1, Supreme Court',
        reminder: '3 days'
      },
      {
        id: 'hearing-003',
        case_id: 'GST-003',
        date: pastDateStr,
        start_time: '11:00',
        end_time: '12:00',
        timezone: 'Asia/Kolkata',
        court_id: '3',
        forum_id: '3',
        authority_id: '3',
        authority_name: 'Commissioner of GST, Bangalore Zone',
        forum_name: 'Karnataka High Court',
        judge_name: 'Shri A.K. Verma',
        bench_details: 'Single Member Bench',
        judge_ids: ['3'],
        purpose: 'mention',
        status: 'concluded',
        outcome: 'Adjournment',
        outcome_text: 'Adjourned for filing additional documents',
        created_by: 'user-001',
        created_at: '2024-02-01T10:00:00Z',
        updated_at: '2024-02-28T15:00:00Z',
        // Legacy compatibility fields for HearingScheduler component
        clientId: '2',
        judgeId: '3',
        time: '11:00',
        type: 'Adjourned',
        agenda: 'GST Demand Notice Challenge',
        court: 'Additional Commissioner Office',
        judge: 'Shri A.K. Verma',
        location: 'GST Bhavan, Conference Room 2',
        reminder: '7 days'
      }
    ];

    // Apply filters if provided
    if (!filters) return mockHearings;
    
    return mockHearings.filter(hearing => {
      if (filters.cases?.length && !filters.cases.includes(hearing.case_id)) return false;
      if (filters.courts?.length && !filters.courts.includes(hearing.court_id)) return false;
      if (filters.status?.length && !filters.status.includes(hearing.status)) return false;
      if (filters.purpose?.length && !filters.purpose.includes(hearing.purpose)) return false;
      
      if (filters.dateFrom && hearing.date < filters.dateFrom) return false;
      if (filters.dateTo && hearing.date > filters.dateTo) return false;
      
      return true;
    });
  }
};
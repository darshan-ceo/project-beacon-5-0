import { AppAction } from '@/contexts/AppStateContext';
import { toast } from '@/hooks/use-toast';
import { Hearing, HearingFormData, HearingFilters, HearingConflict, HearingNotification } from '@/types/hearings';
import { apiService } from './apiService';
import { integrationsService } from './integrationsService';
import { calendarService } from './calendar/calendarService';
import { loadAppState } from '@/data/storageShim';
import { timelineService } from './timelineService';
import { generateOutcomeTasks } from './hearingOutcomeTemplates';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { auditService } from '@/services/auditService';
import { notificationSystemService } from '@/services/notificationSystemService';

const isDev = import.meta.env.DEV;

const log = (level: 'success' | 'error', action: string, details?: any) => {
  if (!isDev) return;
  const color = level === 'success' ? 'color: green' : 'color: red';
  console.log(`%c[Hearings] ${action} ${level}`, color, details);
};

/**
 * Converts empty strings to null for UUID fields
 * Prevents "invalid input syntax for type uuid" errors
 */
const sanitizeUuidField = (value: string | undefined | null): string | null => {
  if (!value || value.trim() === '') {
    return null;
  }
  return value;
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

      // Parse date and time components to store as UTC (avoid timezone conversion)
      const [hours, minutes] = (data.start_time || '10:00').split(':').map(Number);
      const [year, month, day] = data.date.split('-').map(Number);
      const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));

      const hearingData = {
        case_id: data.case_id,
        stage_instance_id: sanitizeUuidField(data.stage_instance_id), // Link to stage workflow
        hearing_date: utcDate.toISOString(),
        next_hearing_date: null,
        // Sanitize UUID fields - convert empty strings to null
        court_id: sanitizeUuidField(data.court_id),
        authority_id: sanitizeUuidField(data.authority_id),
        forum_id: sanitizeUuidField(data.forum_id),
        court_name: data.court_id || null,
        judge_name: data.judge_ids?.join(', ') || null,
        status: 'scheduled',
        notes: data.notes || null,
        outcome: null,
        hearing_type: data.hearing_type || 'General'
      };

      // Persist to Supabase first
      const savedHearing = await storage.create<any>('hearings', hearingData);

      // Convert to app format with backward compatibility
      // Ensure BOTH caseId and case_id are set for consistent filtering across components
      const newHearing: Hearing = {
        id: savedHearing.id,
        case_id: savedHearing.case_id,
        caseId: savedHearing.case_id, // Ensure legacy field is also set
        stage_instance_id: savedHearing.stage_instance_id || data.stage_instance_id, // Include stage linkage
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
        hearing_type: data.hearing_type || 'General',
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
      
      // Add timeline entry with proper user UUID
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const appState = await loadAppState();
        const relatedCase = appState.cases.find(c => c.id === data.case_id);
        if (relatedCase && user) {
          await timelineService.addEntry({
            caseId: data.case_id,
            type: 'hearing_scheduled',
            title: 'Hearing Scheduled',
            description: `Hearing scheduled for ${format(new Date(data.date), 'dd MMM yyyy')} at ${data.start_time}`,
            createdBy: 'System', // Will be converted to UUID in timelineService
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
        const settings = await integrationsService.loadCalendarSettings();
        if (settings?.autoSync && settings.provider !== 'none') {
          const connectionStatus = await integrationsService.getConnectionStatus(settings.provider);
          
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
      
      // Log audit event for hearing creation
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', currentUser?.id).single();
        if (currentUser && profile?.tenant_id) {
          await auditService.log('create_hearing', profile.tenant_id, {
            userId: currentUser.id,
            entityType: 'hearing',
            entityId: newHearing.id,
            details: { 
              caseId: data.case_id,
              date: data.date,
              startTime: data.start_time,
              court: data.court_id
            }
          });
        }
      } catch (auditError) {
        console.warn('Failed to log audit event for hearing creation:', auditError);
      }
      
      log('success', 'create hearing', { hearingId: newHearing.id });

      // Trigger task bundle automation for hearing_scheduled
      if (data.case_id) {
        try {
          const { taskBundleTriggerService } = await import('./taskBundleTriggerService');
          const { storageManager: sm } = await import('@/data/StorageManager');
          
          // Get case data for automation
          const caseData = await sm.getStorage().getById<any>('cases', data.case_id);
          
          if (caseData) {
            await taskBundleTriggerService.triggerTaskBundles(
              {
                id: caseData.id,
                caseNumber: caseData.case_number || caseData.caseNumber,
                clientId: caseData.client_id || caseData.clientId,
                assignedToId: caseData.assigned_to || caseData.assignedToId || 'emp-1',
                assignedToName: caseData.assigned_to_name || caseData.assignedToName || 'Current User',
                currentStage: caseData.stage_code || caseData.currentStage || 'Any Stage',
                noticeType: caseData.notice_type || caseData.noticeType,
                clientTier: caseData.client_tier || caseData.clientTier
              },
              'hearing_scheduled',
              (caseData.stage_code || caseData.currentStage || 'ANY') as any,
              dispatch
            );
            
            console.log(`[Hearings] Task bundle automation triggered for hearing: ${newHearing.id}`);
          }
        } catch (bundleError) {
          console.error('[Hearings] Failed to trigger task bundle automation:', bundleError);
          // Don't fail the hearing creation if automation fails
        }
      }

      // Emit automation event for rules engine (notifications, etc.)
      try {
        const { emitHearingSchedule } = await import('@/utils/automationEventConnectors');
        await emitHearingSchedule(newHearing.id, data.case_id, {
          hearingDate: data.date,
          startTime: data.start_time,
          courtId: data.court_id,
          forumId: data.forum_id
        });
        console.log(`[Hearings] Automation event emitted for hearing: ${newHearing.id}`);
      } catch (eventError) {
        console.error('[Hearings] Failed to emit automation event:', eventError);
      }

      // Send notification to case assignee about new hearing
      try {
        const appState = await loadAppState();
        const relatedCase = appState.cases.find(c => c.id === data.case_id);
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        // Get assignee ID using ALL possible property names (camelCase, snake_case, with/without Id suffix)
        // Data comes in different formats depending on source (DB vs context vs adapter transform)
        const assigneeId = 
          (relatedCase as any)?.assignedTo ||       // camelCase without Id (from SupabaseAdapter transform)
          (relatedCase as any)?.assignedToId ||     // camelCase with Id
          (relatedCase as any)?.assigned_to ||      // snake_case (raw DB column)
          (relatedCase as any)?.assigned_to_id;     // snake_case with _id suffix
        
        const caseNumber = (relatedCase as any)?.caseNumber || (relatedCase as any)?.case_number || 'Unknown';
        
        // Dev logging: show assignee resolution
        if (isDev) {
          console.log('[Hearings] Notification check:', {
            caseId: data.case_id,
            currentUserId: currentUser?.id,
            resolvedAssigneeId: assigneeId,
            rawAssignedTo: (relatedCase as any)?.assignedTo,
            rawAssignedToId: (relatedCase as any)?.assignedToId,
            rawAssigned_to: (relatedCase as any)?.assigned_to,
            willNotify: assigneeId && assigneeId !== currentUser?.id
          });
        }
        
        // Notify case assignee if different from current user
        if (assigneeId && assigneeId !== currentUser?.id) {
          await notificationSystemService.createNotification(
            'hearing_scheduled',
            `Hearing Scheduled: ${format(new Date(data.date), 'dd MMM yyyy')}`,
            `A hearing has been scheduled for case ${caseNumber} on ${format(new Date(data.date), 'dd MMM yyyy')} at ${data.start_time || '10:00'}`,
            assigneeId,
            {
              relatedEntityType: 'hearing',
              relatedEntityId: newHearing.id,
              channels: ['in_app'],
              metadata: { 
                caseId: data.case_id, 
                hearingDate: data.date,
                startTime: data.start_time,
                scheduledBy: currentUser?.id
              }
            }
          );
          console.log(`[Hearings] Notification sent to case assignee: ${assigneeId}`);
        } else if (isDev && !assigneeId) {
          console.log('[Hearings] Notification skipped: No assignee found for case');
        } else if (isDev && assigneeId === currentUser?.id) {
          console.log('[Hearings] Notification skipped: Self-assignment (creator is assignee)');
        }
      } catch (notifError) {
        console.warn('[Hearings] Failed to send notification for hearing scheduled:', notifError);
      }

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
      // Import storage manager
      const { storageManager } = await import('@/data/StorageManager');
      const storage = storageManager.getStorage();

      // Prepare update data with proper field mapping
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString()
      };

      // Map camelCase to snake_case for database fields
      // Handle date/time updates with UTC to avoid timezone conversion
      if (updates.date !== undefined || updates.start_time !== undefined || updates.time !== undefined) {
        const dateValue = updates.date || new Date().toISOString().split('T')[0];
        const timeValue = updates.start_time || updates.time || '10:00';
        const [hours, minutes] = timeValue.split(':').map(Number);
        const [year, month, day] = dateValue.split('-').map(Number);
        const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
        updateData.hearing_date = utcDate.toISOString();
      }
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.notes !== undefined) updateData.notes = updates.notes;
      if (updates.agenda !== undefined) updateData.agenda = updates.agenda;
      if (updates.outcome !== undefined) updateData.outcome = updates.outcome;
      if (updates.outcome_text !== undefined) updateData.outcome_text = updates.outcome_text;
      if (updates.next_hearing_date !== undefined) updateData.next_hearing_date = updates.next_hearing_date;
      
      // Sanitize UUID fields
      if (updates.court_id !== undefined) updateData.court_id = sanitizeUuidField(updates.court_id);
      if (updates.authority_id !== undefined) updateData.authority_id = sanitizeUuidField(updates.authority_id);
      if (updates.forum_id !== undefined) updateData.forum_id = sanitizeUuidField(updates.forum_id);
      if (updates.case_id !== undefined) updateData.case_id = sanitizeUuidField(updates.case_id);
      
      if (updates.hearing_type !== undefined) updateData.hearing_type = updates.hearing_type;

      // Handle judge_name from judge_ids
      if (updates.judge_ids !== undefined) {
        updateData.judge_name = updates.judge_ids?.join(', ') || null;
      }

      // Persist to Supabase
      await storage.update('hearings', id, updateData);

      // Fetch the existing hearing and merge with updates for full data dispatch
      const existingHearing = await storage.getById<any>('hearings', id);
      const fullHearing = {
        // Start with all existing DB fields mapped to app-level names
        id,
        case_id: existingHearing?.case_id,
        caseId: existingHearing?.case_id, // Legacy alias
        stage_instance_id: existingHearing?.stage_instance_id,
        hearing_type: existingHearing?.hearing_type,
        date: existingHearing?.hearing_date?.split('T')[0],
        start_time: existingHearing?.hearing_date ? new Date(existingHearing.hearing_date).toISOString().slice(11, 16) : '10:00',
        time: existingHearing?.hearing_date ? new Date(existingHearing.hearing_date).toISOString().slice(11, 16) : '10:00',
        status: existingHearing?.status,
        notes: existingHearing?.notes,
        agenda: existingHearing?.notes, // DB 'notes' column maps to UI 'agenda'
        outcome: existingHearing?.outcome,
        outcome_text: existingHearing?.outcome_text,
        court_id: existingHearing?.court_id,
        authority_id: existingHearing?.authority_id,
        forum_id: existingHearing?.forum_id,
        authority_name: existingHearing?.authority_name,
        forum_name: existingHearing?.forum_name,
        judge_name: existingHearing?.judge_name,
        bench_details: existingHearing?.bench_details,
        next_hearing_date: existingHearing?.next_hearing_date,
        purpose: existingHearing?.hearing_purpose || existingHearing?.purpose,
        created_by: existingHearing?.created_by,
        created_at: existingHearing?.created_at,
        updated_at: existingHearing?.updated_at,
        // Apply the updates on top to override with new values
        ...updates
      };
      dispatch({ type: 'UPDATE_HEARING', payload: fullHearing });
      
      // Add timeline entry for hearing updated with proper user UUID
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const appState = await loadAppState();
        const hearing = appState.hearings.find(h => h.id === id);
        if (hearing && user) {
          await timelineService.addEntry({
            caseId: hearing.case_id,
            type: 'hearing_scheduled',
            title: 'Hearing Updated',
            description: `Hearing rescheduled to ${updates.date ? format(new Date(updates.date), 'dd MMM yyyy') : 'new date'}${updates.start_time ? ` at ${updates.start_time}` : ''}`,
            createdBy: 'System', // Will be converted to UUID in timelineService
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
        const settings = await integrationsService.loadCalendarSettings();
        if (settings?.autoSync && settings.provider !== 'none') {
          const connectionStatus = await integrationsService.getConnectionStatus(settings.provider);
          
          if (connectionStatus.connected) {
            // Get the full hearing object from state
            const appState = await loadAppState();
            const fullHearingState = appState.hearings.find(h => h.id === id) as any;
            
            if (fullHearingState && fullHearingState.externalEventId) {
              // Update existing event
              await calendarService.updateEvent(fullHearingState as any, settings);
              // Dispatch sync status update
              dispatch({ type: 'UPDATE_HEARING', payload: { id, syncStatus: 'synced' } });
            } else if (fullHearingState && !fullHearingState.externalEventId) {
              // Create event if it doesn't exist yet
              const eventId = await calendarService.createEvent(fullHearingState as any, settings);
              if (eventId) {
                dispatch({ type: 'UPDATE_HEARING', payload: { id, externalEventId: eventId, syncStatus: 'synced' } });
              }
            }
          }
        }
      } catch (syncError) {
        console.error('Failed to auto-sync hearing update to calendar:', syncError);
        dispatch({ type: 'UPDATE_HEARING', payload: { id, syncStatus: 'sync_failed' } });
      }
      
      toast({
        title: "Hearing Updated",
        description: "Hearing has been updated successfully.",
      });
      
      // Log audit event for hearing update
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user?.id).single();
        if (user && profile?.tenant_id) {
          await auditService.log('update_hearing', profile.tenant_id, {
            userId: user.id,
            entityType: 'hearing',
            entityId: id,
            details: { 
              updatedFields: Object.keys(updates),
              date: updates.date,
              status: updates.status
            }
          });
        }
      } catch (auditError) {
        console.warn('Failed to log audit event for hearing update:', auditError);
      }
      
      log('success', 'update hearing', { hearingId: id, updates: Object.keys(updates) });
      
    } catch (error) {
      log('error', 'update hearing failed', error);
      toast({
        title: "Error",
        description: "Failed to update hearing. Please try again.",
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
          const settings = await integrationsService.loadCalendarSettings();
          if (settings && settings.provider !== 'none') {
            const connectionStatus = await integrationsService.getConnectionStatus(settings.provider);
            
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
        
        // Log audit event for hearing deletion
        try {
          const { data: { user } } = await supabase.auth.getUser();
          const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user?.id).single();
          if (user && profile?.tenant_id) {
            await auditService.log('delete_hearing', profile.tenant_id, {
              userId: user.id,
              entityType: 'hearing',
              entityId: id,
              details: { 
                caseId: hearing?.case_id,
                date: hearing?.date
              }
            });
          }
        } catch (auditError) {
          console.warn('Failed to log audit event for hearing deletion:', auditError);
        }
        
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
      // Import storage manager and error utils
      const { storageManager } = await import('@/data/StorageManager');
      const { getErrorMessage } = await import('@/utils/errorUtils');
      const storage = storageManager.getStorage();
      
      // Normalize next_hearing_date to ISO timestamp if provided
      let normalizedNextHearingDate: string | null = null;
      if (nextHearingDate) {
        // If it's just a date string (YYYY-MM-DD), convert to midnight UTC
        if (nextHearingDate.length === 10) {
          const [year, month, day] = nextHearingDate.split('-').map(Number);
          normalizedNextHearingDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0)).toISOString();
        } else {
          normalizedNextHearingDate = nextHearingDate;
        }
      }
      
      const updates: any = {
        status: 'concluded' as const,
        outcome,
        outcome_text: outcomeText || null,
        next_hearing_date: normalizedNextHearingDate,
        updated_at: new Date().toISOString()
      };

      // Persist to database using storage adapter (like createHearing/updateHearing)
      await storage.update('hearings', id, updates);
      
      // Fetch the updated hearing from database to ensure UI state is in sync
      const updatedHearing = await storage.getById<any>('hearings', id);
      
      if (!updatedHearing) {
        throw new Error('Hearing not found after update');
      }
      
      // Get the full hearing with all fields for dispatch
      const hearing: any = {
        id: updatedHearing.id,
        case_id: updatedHearing.case_id,
        date: updatedHearing.hearing_date?.split('T')[0],
        start_time: updatedHearing.start_time || '10:00',
        time: updatedHearing.start_time || '10:00',
        status: updatedHearing.status,
        outcome: updatedHearing.outcome,
        outcome_text: updatedHearing.outcome_text,
        notes: updatedHearing.notes,
        next_hearing_date: updatedHearing.next_hearing_date,
        court_id: updatedHearing.court_id,
        authority_id: updatedHearing.authority_id,
        forum_id: updatedHearing.forum_id,
        judge_name: updatedHearing.judge_name,
        created_at: updatedHearing.created_at,
        updated_at: updatedHearing.updated_at
      };

      // Update hearing in state with complete data
      if (dispatch) {
        dispatch({ 
          type: 'UPDATE_HEARING', 
          payload: hearing 
        });
      }

      // Add timeline entry for outcome
      try {
        await timelineService.addEntry({
          caseId: hearing.case_id,
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

      // Auto-create next hearing if outcome is Adjournment
      if (outcome === 'Adjournment' && autoCreateNext && nextHearingDate && dispatch) {
        try {
          const nextHearingData: HearingFormData = {
            case_id: hearing.case_id,
            date: nextHearingDate,
            start_time: hearing.start_time || '10:00',
            end_time: hearing.end_time || '11:00',
            timezone: hearing.timezone || 'Asia/Kolkata',
            court_id: hearing.court_id,
            judge_ids: hearing.judge_ids || [],
            purpose: hearing.purpose || 'mention',
            notes: `Adjourned from ${format(new Date(hearing.date), 'dd MMM yyyy')}. ${outcomeText || ''}`,
            authority_id: hearing.authority_id,
            forum_id: hearing.forum_id
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

      // Auto-generate outcome-based tasks
      if (dispatch) {
        try {
          const appState = await loadAppState();
          const relatedCase = appState.cases.find(c => c.id === hearing.case_id) as any;
          
          if (relatedCase) {
            // Get current user info
            const { data: { user } } = await supabase.auth.getUser();
            const currentUserId = user?.id || 'system';
            
            // Find current user in employees
            const currentEmployee = appState.employees.find(e => e.id === currentUserId) as any;
            const currentUserName = currentEmployee?.full_name || 'System';
            
            // Find assigned employee  
            const assignedEmployee = appState.employees.find(e => e.id === (relatedCase.assigned_to_id || relatedCase.assignedToId)) as any;
            const assignedToName = assignedEmployee?.full_name || 'Unassigned';

            await generateOutcomeTasks(
              outcome,
              id,
              relatedCase.id,
              relatedCase.client_id || relatedCase.clientId,
              relatedCase.case_number || relatedCase.caseNumber,
              hearing.date,
              relatedCase.assigned_to_id || relatedCase.assignedToId || '',
              assignedToName,
              currentUserId,
              currentUserName,
              dispatch
            );
            
            console.log('[Hearings] Auto-generated outcome tasks for outcome:', outcome);
          }
        } catch (taskError) {
          console.error('[Hearings] Failed to generate outcome tasks:', taskError);
          // Don't show error to user as this is non-critical
        }
      }
      
      // Log audit event for outcome recording
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user?.id).single();
        if (user && profile?.tenant_id) {
          await auditService.log('update_hearing', profile.tenant_id, {
            userId: user.id,
            entityType: 'hearing',
            entityId: id,
            details: { 
              action: 'record_outcome',
              outcome,
              outcomeText,
              nextHearingDate,
              caseId: hearing.case_id
            }
          });
        }
      } catch (auditError) {
        console.warn('Failed to log audit event for hearing outcome:', auditError);
      }
      
      toast({
        title: "Outcome Recorded",
        description: `Hearing outcome: ${outcome}`,
      });
      
      log('success', 'record outcome', { hearingId: id, outcome });
      return hearing;
    } catch (error) {
      log('error', 'record outcome', error);
      // Use getErrorMessage for actionable error messages
      const { getErrorMessage } = await import('@/utils/errorUtils');
      const errorMsg = getErrorMessage(error);
      toast({
        title: "Error",
        description: errorMsg || "Failed to record hearing outcome. Please try again.",
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
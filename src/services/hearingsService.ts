import { AppAction } from '@/contexts/AppStateContext';
import { toast } from '@/hooks/use-toast';
import { Hearing, HearingFormData, HearingFilters, HearingConflict, HearingNotification } from '@/types/hearings';
import { apiService } from './apiService';

const isDev = import.meta.env.DEV;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

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
        log('success', 'fetch hearings', { count: response.data.length, filters });
        return response.data;
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
      const hearingData = {
        ...data,
        id: `hearing-${Date.now()}`,
        status: 'scheduled' as const,
        created_by: 'current-user-id',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        timezone: data.timezone || 'Asia/Kolkata'
      };

      const response = await apiService.post<Hearing>('/api/hearings', hearingData);
      
      if (response.success && response.data) {
        const newHearing = response.data;
        dispatch({ type: 'ADD_HEARING', payload: newHearing });
        
        toast({
          title: "Hearing Scheduled",
          description: `Hearing scheduled for ${data.date} at ${data.start_time}.`,
        });
        
        log('success', 'create hearing', { hearingId: newHearing.id });
        return newHearing;
      }
      
      throw new Error('Failed to create hearing');
    } catch (error) {
      log('error', 'create hearing', error);
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

      const response = await apiService.put<Hearing>(`/api/hearings/${id}`, updateData);
      
      if (response.success) {
        const updatedHearing = { id, ...updateData };
        dispatch({ type: 'UPDATE_HEARING', payload: updatedHearing });
        
        toast({
          title: "Hearing Updated",
          description: "Hearing has been updated successfully.",
        });
        
        log('success', 'update hearing', { hearingId: id, updates: Object.keys(updates) });
      } else {
        throw new Error('Failed to update hearing');
      }
    } catch (error) {
      log('error', 'update hearing', error);
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
      const response = await apiService.delete(`/api/hearings/${id}`);
      
      if (response.success) {
        dispatch({ type: 'DELETE_HEARING', payload: id });
        
        toast({
          title: "Hearing Cancelled",
          description: "Hearing has been cancelled successfully.",
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

  /**
   * Record hearing outcome
   */
  async recordOutcome(id: string, outcome: string, outcomeText?: string, nextHearingDate?: string): Promise<void> {
    try {
      const updates = {
        status: 'concluded' as const,
        outcome,
        outcome_text: outcomeText,
        next_hearing_date: nextHearingDate,
        updated_at: new Date().toISOString()
      };

      const response = await apiService.put<Hearing>(`/api/hearings/${id}`, updates);
      
      if (response.success) {
        toast({
          title: "Outcome Recorded",
          description: `Hearing outcome: ${outcome}`,
        });
        
        log('success', 'record outcome', { hearingId: id, outcome });
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
   * Upload order file
   */
  async uploadOrder(hearingId: string, file: File): Promise<string> {
    try {
      // Upload file first
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadResponse = await fetch(`${API_BASE_URL}/api/files`, {
        method: 'POST',
        body: formData
      });
      
      const uploadResult = await uploadResponse.json();
      const fileId = uploadResult.file_id;
      
      // Update hearing with file ID
      await this.updateHearing(hearingId, { order_file_id: fileId }, {} as React.Dispatch<AppAction>);
      
      toast({
        title: "Order Uploaded",
        description: "Order document has been uploaded successfully.",
      });
      
      log('success', 'upload order', { hearingId, fileId });
      return fileId;
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
        return response.data;
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
      const response = await apiService.get(`/api/cases/${caseId}/stages/${stageInstanceId}/summary`);
      
      if (response.success && response.data) {
        return response.data;
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
    const mockHearings: Hearing[] = [
      {
        id: 'hearing-001',
        case_id: 'GST-001',
        stage_instance_id: 'stage-inst-001',
        cycle_no: 1,
        date: '2024-03-15',
        start_time: '10:30',
        end_time: '11:30',
        timezone: 'Asia/Kolkata',
        court_id: '1',
        courtroom: 'Court Room 3',
        judge_ids: ['1'],
        purpose: 'final',
        status: 'scheduled',
        notes: 'Final hearing for ITC disallowance case',
        attendance: {
          our_counsel_id: '2',
          opposite_counsel: 'Advocate Kumar',
          client_rep: 'Mr. Sharma (Director)'
        },
        created_by: 'user-001',
        created_at: '2024-02-01T10:00:00Z',
        updated_at: '2024-02-01T10:00:00Z',
        // Legacy compatibility
        clientId: 'CLT-MOCK-001',
        judgeId: '1',
        time: '10:30',
        type: 'Final',
        agenda: 'Final hearing for ITC disallowance case'
      },
      {
        id: 'hearing-002',
        case_id: 'GST-002',
        date: '2024-02-28',
        start_time: '14:00',
        end_time: '15:00',
        timezone: 'Asia/Kolkata',
        court_id: '2',
        judge_ids: ['2'],
        purpose: 'mention',
        status: 'concluded',
        outcome: 'Adjourned',
        outcome_text: 'Adjourned for filing additional documents',
        next_hearing_date: '2024-03-20',
        created_by: 'user-001',
        created_at: '2024-02-01T10:00:00Z',
        updated_at: '2024-02-28T15:00:00Z',
        // Legacy compatibility
        clientId: 'CLT-MOCK-002',
        judgeId: '2',
        time: '14:00',
        type: 'Final'
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
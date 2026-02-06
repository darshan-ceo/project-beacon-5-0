/**
 * Lead Service
 * Core CRM operations for managing leads within client_contacts
 */

import { supabase } from '@/integrations/supabase/client';
import { 
  Lead, 
  LeadStatus, 
  LeadFilters, 
  LeadActivity, 
  ActivityType,
  PipelineStats,
  LEAD_STATUS_CONFIG 
} from '@/types/lead';

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class LeadService {
  /**
   * Get all leads (contacts with lead_status set)
   */
  async getLeads(filters?: LeadFilters): Promise<ServiceResponse<Lead[]>> {
    try {
      let query = supabase
        .from('client_contacts')
        .select('*')
        .not('lead_status', 'is', null)
        .order('last_activity_at', { ascending: false });

      // Apply filters
      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('lead_status', filters.status);
        } else {
          query = query.eq('lead_status', filters.status);
        }
      }

      if (filters?.source) {
        query = query.eq('lead_source', filters.source);
      }

      if (filters?.owner_user_id) {
        query = query.eq('owner_user_id', filters.owner_user_id);
      }

      if (filters?.min_score !== undefined) {
        query = query.gte('lead_score', filters.min_score);
      }

      if (filters?.max_score !== undefined) {
        query = query.lte('lead_score', filters.max_score);
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,designation.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, data: data as unknown as Lead[] };
    } catch (error: any) {
      console.error('Error fetching leads:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get a single lead by ID
   */
  async getLead(contactId: string): Promise<ServiceResponse<Lead>> {
    try {
      const { data, error } = await supabase
        .from('client_contacts')
        .select('*')
        .eq('id', contactId)
        .single();

      if (error) throw error;

      return { success: true, data: data as unknown as Lead };
    } catch (error: any) {
      console.error('Error fetching lead:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Mark an existing contact as a lead
   */
  async markAsLead(
    contactId: string, 
    leadData: {
      lead_status?: LeadStatus;
      lead_source?: string;
      expected_value?: number;
      expected_close_date?: string;
    } = {}
  ): Promise<ServiceResponse<Lead>> {
    try {
      const { data, error } = await supabase
        .from('client_contacts')
        .update({
          lead_status: leadData.lead_status || 'new',
          lead_source: leadData.lead_source || null,
          expected_value: leadData.expected_value || null,
          expected_close_date: leadData.expected_close_date || null,
          last_activity_at: new Date().toISOString(),
        } as any)
        .eq('id', contactId)
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await this.addActivity(contactId, {
        activity_type: 'status_change',
        subject: 'Marked as Lead',
        description: `Contact marked as lead with status: ${leadData.lead_status || 'new'}`,
      });

      return { success: true, data: data as unknown as Lead };
    } catch (error: any) {
      console.error('Error marking contact as lead:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update lead status
   */
  async updateLeadStatus(
    contactId: string, 
    status: LeadStatus,
    notes?: string
  ): Promise<ServiceResponse<Lead>> {
    try {
      const updateData: any = {
        lead_status: status,
        last_activity_at: new Date().toISOString(),
      };

      // If lost, we might want to capture the reason
      if (status === 'lost' && notes) {
        updateData.lost_reason = notes;
      }

      const { data, error } = await supabase
        .from('client_contacts')
        .update(updateData as any)
        .eq('id', contactId)
        .select()
        .single();

      if (error) throw error;

      // Log status change activity
      await this.addActivity(contactId, {
        activity_type: 'status_change',
        subject: `Status changed to ${LEAD_STATUS_CONFIG[status].label}`,
        description: notes || undefined,
      });

      return { success: true, data: data as unknown as Lead };
    } catch (error: any) {
      console.error('Error updating lead status:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update lead score
   */
  async updateLeadScore(contactId: string, score: number): Promise<ServiceResponse<Lead>> {
    try {
      const clampedScore = Math.max(0, Math.min(100, score));

      const { data, error } = await supabase
        .from('client_contacts')
        .update({
          lead_score: clampedScore,
          last_activity_at: new Date().toISOString(),
        } as any)
        .eq('id', contactId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: data as unknown as Lead };
    } catch (error: any) {
      console.error('Error updating lead score:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update lead details
   */
  async updateLead(
    contactId: string, 
    updates: Partial<Pick<Lead, 'lead_source' | 'expected_value' | 'expected_close_date' | 'lead_score' | 'notes'>>
  ): Promise<ServiceResponse<Lead>> {
    try {
      const { data, error } = await supabase
        .from('client_contacts')
        .update({
          ...updates,
          last_activity_at: new Date().toISOString(),
        } as any)
        .eq('id', contactId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: data as unknown as Lead };
    } catch (error: any) {
      console.error('Error updating lead:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get lead activities
   */
  async getActivities(contactId: string): Promise<ServiceResponse<LeadActivity[]>> {
    try {
      const { data, error } = await supabase
        .from('lead_activities')
        .select(`
          *,
          profiles:created_by (
            full_name
          )
        `)
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map to include created_by_name
      const activities = (data || []).map((activity: any) => ({
        ...activity,
        created_by_name: activity.profiles?.full_name || 'Unknown',
      }));

      return { success: true, data: activities as LeadActivity[] };
    } catch (error: any) {
      console.error('Error fetching lead activities:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Add activity to a lead
   */
  async addActivity(
    contactId: string,
    activity: {
      activity_type: ActivityType;
      subject?: string;
      description?: string;
      outcome?: string;
      next_action?: string;
      next_action_date?: string;
    }
  ): Promise<ServiceResponse<LeadActivity>> {
    try {
      // Get current user and tenant
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const { data, error } = await supabase
        .from('lead_activities')
        .insert({
          tenant_id: profile.tenant_id,
          contact_id: contactId,
          activity_type: activity.activity_type,
          subject: activity.subject || null,
          description: activity.description || null,
          outcome: activity.outcome || null,
          next_action: activity.next_action || null,
          next_action_date: activity.next_action_date || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Update last_activity_at on the contact
      await supabase
        .from('client_contacts')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('id', contactId);

      return { success: true, data: data as LeadActivity };
    } catch (error: any) {
      console.error('Error adding lead activity:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get pipeline statistics
   */
  async getPipelineStats(): Promise<ServiceResponse<PipelineStats>> {
    try {
      const { data: leads, error } = await supabase
        .from('client_contacts')
        .select('lead_status, expected_value')
        .not('lead_status', 'is', null);

      if (error) throw error;

      const statuses: LeadStatus[] = ['new', 'contacted', 'qualified', 'proposal_sent', 'negotiation', 'won', 'lost'];
      
      const byStatus = statuses.map(status => {
        const statusLeads = (leads || []).filter((l: any) => l.lead_status === status);
        return {
          status,
          count: statusLeads.length,
          value: statusLeads.reduce((sum: number, l: any) => sum + (l.expected_value || 0), 0),
        };
      });

      const totalLeads = leads?.length || 0;
      const wonLeads = byStatus.find(s => s.status === 'won')?.count || 0;
      const totalValue = byStatus.reduce((sum, s) => sum + s.value, 0);
      const wonValue = byStatus.find(s => s.status === 'won')?.value || 0;

      return {
        success: true,
        data: {
          total_leads: totalLeads,
          total_value: totalValue,
          by_status: byStatus,
          conversion_rate: totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0,
          avg_deal_value: wonLeads > 0 ? wonValue / wonLeads : 0,
        },
      };
    } catch (error: any) {
      console.error('Error fetching pipeline stats:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove lead status (convert back to regular contact)
   */
  async unmarkAsLead(contactId: string): Promise<ServiceResponse<Lead>> {
    try {
      const { data, error } = await supabase
        .from('client_contacts')
        .update({
          lead_status: null,
          lead_source: null,
          lead_score: 0,
          expected_value: null,
          expected_close_date: null,
          lost_reason: null,
        } as any)
        .eq('id', contactId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: data as unknown as Lead };
    } catch (error: any) {
      console.error('Error unmarking lead:', error);
      return { success: false, error: error.message };
    }
  }
}

export const leadService = new LeadService();

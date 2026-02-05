/**
 * Stage Replies Service
 * CRUD operations for replies linked to stage notices
 */

import { supabase } from '@/integrations/supabase/client';
import { StageReply, CreateStageReplyInput, UpdateStageReplyInput, ReplyFilingStatus } from '@/types/stageWorkflow';
import { toast } from '@/hooks/use-toast';
import { stageNoticesService } from './stageNoticesService';

class StageRepliesService {
  /**
   * Fetch all replies for a notice
   */
  async getRepliesByNotice(noticeId: string): Promise<StageReply[]> {
    try {
      const { data, error } = await supabase
        .from('stage_replies')
        .select(`
          *,
          profiles:filed_by (full_name)
        `)
        .eq('notice_id', noticeId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(this.mapToStageReply);
    } catch (error) {
      console.error('[StageRepliesService] Failed to fetch replies:', error);
      return [];
    }
  }

  /**
   * Fetch all replies for a stage instance
   */
  async getRepliesByStageInstance(stageInstanceId: string): Promise<StageReply[]> {
    try {
      const { data, error } = await supabase
        .from('stage_replies')
        .select(`
          *,
          profiles:filed_by (full_name)
        `)
        .eq('stage_instance_id', stageInstanceId)
        .order('reply_date', { ascending: false });

      if (error) throw error;

      return (data || []).map(this.mapToStageReply);
    } catch (error) {
      console.error('[StageRepliesService] Failed to fetch replies by stage:', error);
      return [];
    }
  }

  /**
   * Get replies count for a case (across all notices)
   */
  async getRepliesCountByCase(caseId: string): Promise<number> {
    try {
      // First get all notices for the case
      const notices = await stageNoticesService.getNoticesByCase(caseId);
      
      if (notices.length === 0) return 0;

      const noticeIds = notices.map(n => n.id);

      const { count, error } = await supabase
        .from('stage_replies')
        .select('*', { count: 'exact', head: true })
        .in('notice_id', noticeIds);

      if (error) throw error;

      return count || 0;
    } catch (error) {
      console.error('[StageRepliesService] Failed to count replies:', error);
      return 0;
    }
  }

  /**
   * Get a single reply by ID
   */
  async getReply(id: string): Promise<StageReply | null> {
    try {
      const { data, error } = await supabase
        .from('stage_replies')
        .select(`
          *,
          profiles:filed_by (full_name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      return data ? this.mapToStageReply(data) : null;
    } catch (error) {
      console.error('[StageRepliesService] Failed to fetch reply:', error);
      return null;
    }
  }

  /**
   * Create a new reply
   */
  async createReply(input: CreateStageReplyInput): Promise<StageReply | null> {
    try {
      // Get current user and tenant
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile) throw new Error('User profile not found');

      const { data, error } = await supabase
        .from('stage_replies')
        .insert({
          tenant_id: profile.tenant_id,
          notice_id: input.notice_id,
          stage_instance_id: input.stage_instance_id || null,
          reply_date: input.reply_date || null,
          reply_reference: input.reply_reference || null,
          filing_status: input.filing_status || 'Draft',
          documents: input.documents || [],
          notes: input.notes || null,
          filed_by: user.id
        })
        .select(`
          *,
          profiles:filed_by (full_name)
        `)
        .single();

      if (error) throw error;

      // Update notice status to 'Reply Pending' or 'Replied' based on filing status
      const newNoticeStatus = input.filing_status === 'Filed' || input.filing_status === 'Acknowledged' 
        ? 'Replied' 
        : 'Reply Pending';

      await stageNoticesService.updateNotice(input.notice_id, { status: newNoticeStatus });

      toast({
        title: 'Reply Saved',
        description: input.filing_status === 'Draft' 
          ? 'Reply draft has been saved.' 
          : 'Reply has been filed.'
      });

      return this.mapToStageReply(data);
    } catch (error) {
      console.error('[StageRepliesService] Failed to create reply:', error);
      toast({
        title: 'Error',
        description: 'Failed to save reply. Please try again.',
        variant: 'destructive'
      });
      return null;
    }
  }

  /**
   * Update an existing reply
   */
  async updateReply(id: string, input: UpdateStageReplyInput): Promise<StageReply | null> {
    try {
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString()
      };

      if (input.reply_date !== undefined) updateData.reply_date = input.reply_date;
      if (input.reply_reference !== undefined) updateData.reply_reference = input.reply_reference;
      if (input.filing_status !== undefined) updateData.filing_status = input.filing_status;
      if (input.documents !== undefined) updateData.documents = input.documents;
      if (input.notes !== undefined) updateData.notes = input.notes;

      const { data, error } = await supabase
        .from('stage_replies')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          profiles:filed_by (full_name)
        `)
        .single();

      if (error) throw error;

      // If status changed to Filed, update notice status
      if (input.filing_status === 'Filed' || input.filing_status === 'Acknowledged') {
        await stageNoticesService.updateNotice(data.notice_id, { status: 'Replied' });
      }

      toast({
        title: 'Reply Updated',
        description: 'Reply details have been updated.'
      });

      return this.mapToStageReply(data);
    } catch (error) {
      console.error('[StageRepliesService] Failed to update reply:', error);
      toast({
        title: 'Error',
        description: 'Failed to update reply. Please try again.',
        variant: 'destructive'
      });
      return null;
    }
  }

  /**
   * Delete a reply
   */
  async deleteReply(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('stage_replies')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Reply Deleted',
        description: 'Reply has been removed.'
      });

      return true;
    } catch (error) {
      console.error('[StageRepliesService] Failed to delete reply:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete reply. Please try again.',
        variant: 'destructive'
      });
      return false;
    }
  }

  /**
   * Map database row to StageReply type
   */
  private mapToStageReply(row: any): StageReply {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      notice_id: row.notice_id,
      stage_instance_id: row.stage_instance_id,
      reply_date: row.reply_date,
      reply_reference: row.reply_reference,
      filing_status: row.filing_status as ReplyFilingStatus,
      documents: Array.isArray(row.documents) ? row.documents : [],
      notes: row.notes,
      filed_by: row.filed_by,
      filed_by_name: row.profiles?.full_name || null,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}

export const stageRepliesService = new StageRepliesService();

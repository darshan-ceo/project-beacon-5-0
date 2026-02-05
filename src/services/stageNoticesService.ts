/**
 * Stage Notices Service
 * CRUD operations for stage notices with due date calculations
 */

import { supabase } from '@/integrations/supabase/client';
import { StageNotice, CreateStageNoticeInput, UpdateStageNoticeInput, NoticeStatus } from '@/types/stageWorkflow';
import { toast } from '@/hooks/use-toast';
import { differenceInDays, parseISO, isValid, format } from 'date-fns';

class StageNoticesService {
  /**
   * Fetch all notices for a case
   */
  async getNoticesByCase(caseId: string): Promise<StageNotice[]> {
    try {
      const { data, error } = await supabase
        .from('stage_notices')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(this.mapToStageNotice);
    } catch (error) {
      console.error('[StageNoticesService] Failed to fetch notices:', error);
      return [];
    }
  }

  /**
   * Fetch notices for a specific stage instance
   */
  async getNoticesByStageInstance(stageInstanceId: string): Promise<StageNotice[]> {
    try {
      const { data, error } = await supabase
        .from('stage_notices')
        .select('*')
        .eq('stage_instance_id', stageInstanceId)
        .order('notice_date', { ascending: false });

      if (error) throw error;

      return (data || []).map(this.mapToStageNotice);
    } catch (error) {
      console.error('[StageNoticesService] Failed to fetch notices by stage:', error);
      return [];
    }
  }

  /**
   * Get a single notice by ID
   */
  async getNotice(id: string): Promise<StageNotice | null> {
    try {
      const { data, error } = await supabase
        .from('stage_notices')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      return data ? this.mapToStageNotice(data) : null;
    } catch (error) {
      console.error('[StageNoticesService] Failed to fetch notice:', error);
      return null;
    }
  }

  /**
   * Create a new notice
   */
  async createNotice(input: CreateStageNoticeInput): Promise<StageNotice | null> {
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
        .from('stage_notices')
        .insert({
          tenant_id: profile.tenant_id,
          case_id: input.case_id,
          stage_instance_id: input.stage_instance_id || null,
          notice_type: input.notice_type || null,
          notice_number: input.notice_number || null,
          notice_date: input.notice_date || null,
          due_date: input.due_date || null,
          amount_demanded: input.amount_demanded || null,
          section_invoked: input.section_invoked || null,
          status: input.status || 'Received',
          is_original: input.is_original || false,
          documents: input.documents || [],
          metadata: input.metadata || {},
          created_by: user.id,
          // New fields
          offline_reference_no: input.offline_reference_no || null,
          issuing_authority: input.issuing_authority || null,
          issuing_designation: input.issuing_designation || null,
          tax_period_start: input.tax_period_start || null,
          tax_period_end: input.tax_period_end || null,
          financial_year: input.financial_year || null,
          tax_amount: input.tax_amount || null,
          interest_amount: input.interest_amount || null,
          penalty_amount: input.penalty_amount || null,
          tax_applicable: input.tax_applicable ?? true,
          interest_applicable: input.interest_applicable ?? true,
          penalty_applicable: input.penalty_applicable ?? true,
          workflow_step: input.workflow_step || 'notice'
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Notice Added',
        description: `Notice ${input.notice_number || ''} has been recorded.`
      });

      return this.mapToStageNotice(data);
    } catch (error) {
      console.error('[StageNoticesService] Failed to create notice:', error);
      toast({
        title: 'Error',
        description: 'Failed to add notice. Please try again.',
        variant: 'destructive'
      });
      return null;
    }
  }

  /**
   * Update an existing notice
   */
  async updateNotice(id: string, input: UpdateStageNoticeInput): Promise<StageNotice | null> {
    try {
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString()
      };

      if (input.notice_type !== undefined) updateData.notice_type = input.notice_type;
      if (input.notice_number !== undefined) updateData.notice_number = input.notice_number;
      if (input.notice_date !== undefined) updateData.notice_date = input.notice_date;
      if (input.due_date !== undefined) updateData.due_date = input.due_date;
      if (input.amount_demanded !== undefined) updateData.amount_demanded = input.amount_demanded;
      if (input.section_invoked !== undefined) updateData.section_invoked = input.section_invoked;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.documents !== undefined) updateData.documents = input.documents;
      if (input.metadata !== undefined) updateData.metadata = input.metadata;
      // New fields
      if (input.offline_reference_no !== undefined) updateData.offline_reference_no = input.offline_reference_no;
      if (input.issuing_authority !== undefined) updateData.issuing_authority = input.issuing_authority;
      if (input.issuing_designation !== undefined) updateData.issuing_designation = input.issuing_designation;
      if (input.tax_period_start !== undefined) updateData.tax_period_start = input.tax_period_start;
      if (input.tax_period_end !== undefined) updateData.tax_period_end = input.tax_period_end;
      if (input.financial_year !== undefined) updateData.financial_year = input.financial_year;
      if (input.tax_amount !== undefined) updateData.tax_amount = input.tax_amount;
      if (input.interest_amount !== undefined) updateData.interest_amount = input.interest_amount;
      if (input.penalty_amount !== undefined) updateData.penalty_amount = input.penalty_amount;
      if (input.tax_applicable !== undefined) updateData.tax_applicable = input.tax_applicable;
      if (input.interest_applicable !== undefined) updateData.interest_applicable = input.interest_applicable;
      if (input.penalty_applicable !== undefined) updateData.penalty_applicable = input.penalty_applicable;
      if (input.workflow_step !== undefined) updateData.workflow_step = input.workflow_step;

      const { data, error } = await supabase
        .from('stage_notices')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Notice Updated',
        description: 'Notice details have been updated.'
      });

      return this.mapToStageNotice(data);
    } catch (error) {
      console.error('[StageNoticesService] Failed to update notice:', error);
      toast({
        title: 'Error',
        description: 'Failed to update notice. Please try again.',
        variant: 'destructive'
      });
      return null;
    }
  }

  /**
   * Delete a notice
   */
  async deleteNotice(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('stage_notices')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Notice Deleted',
        description: 'Notice has been removed.'
      });

      return true;
    } catch (error) {
      console.error('[StageNoticesService] Failed to delete notice:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete notice. Please try again.',
        variant: 'destructive'
      });
      return false;
    }
  }

  /**
   * Calculate days until due or overdue
   */
  getDueDateStatus(dueDate: string | null): { daysLeft: number; isOverdue: boolean; label: string } {
    if (!dueDate) {
      return { daysLeft: 0, isOverdue: false, label: 'No due date' };
    }

    try {
      const date = parseISO(dueDate);
      if (!isValid(date)) {
        return { daysLeft: 0, isOverdue: false, label: 'Invalid date' };
      }

      const daysLeft = differenceInDays(date, new Date());
      const isOverdue = daysLeft < 0;

      let label: string;
      if (isOverdue) {
        label = `${Math.abs(daysLeft)} days overdue`;
      } else if (daysLeft === 0) {
        label = 'Due today';
      } else if (daysLeft === 1) {
        label = '1 day left';
      } else {
        label = `${daysLeft} days left`;
      }

      return { daysLeft, isOverdue, label };
    } catch {
      return { daysLeft: 0, isOverdue: false, label: 'Invalid date' };
    }
  }

  /**
   * Auto-create original notice from case data (backward compatibility)
   */
  async ensureOriginalNotice(caseId: string, stageInstanceId: string, caseData: {
    notice_no?: string;
    notice_date?: string;
    tax_demand?: number;
    notice_type?: string;
    section_invoked?: string;
    reply_due_date?: string;
  }): Promise<StageNotice | null> {
    // Check if original notice already exists
    const existingNotices = await this.getNoticesByCase(caseId);
    const hasOriginal = existingNotices.some(n => n.is_original);

    if (hasOriginal) {
      return existingNotices.find(n => n.is_original) || null;
    }

    // Create original notice from case data
    if (caseData.notice_no || caseData.notice_date) {
      return this.createNotice({
        case_id: caseId,
        stage_instance_id: stageInstanceId,
        notice_type: caseData.notice_type || 'Original Notice',
        notice_number: caseData.notice_no,
        notice_date: caseData.notice_date,
        due_date: caseData.reply_due_date,
        amount_demanded: caseData.tax_demand,
        section_invoked: caseData.section_invoked,
        status: 'Received',
        is_original: true
      });
    }

    return null;
  }

  /**
   * Map database row to StageNotice type
   */
  private mapToStageNotice(row: any): StageNotice {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      stage_instance_id: row.stage_instance_id,
      case_id: row.case_id,
      notice_type: row.notice_type,
      notice_number: row.notice_number,
      notice_date: row.notice_date,
      due_date: row.due_date,
      amount_demanded: row.amount_demanded,
      section_invoked: row.section_invoked,
      status: row.status as NoticeStatus,
      is_original: row.is_original || false,
      documents: Array.isArray(row.documents) ? row.documents : [],
      metadata: row.metadata || {},
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
      // New fields for expanded notice workflow
      offline_reference_no: row.offline_reference_no || null,
      issuing_authority: row.issuing_authority || null,
      issuing_designation: row.issuing_designation || null,
      tax_period_start: row.tax_period_start || null,
      tax_period_end: row.tax_period_end || null,
      financial_year: row.financial_year || null,
      tax_amount: row.tax_amount || null,
      interest_amount: row.interest_amount || null,
      penalty_amount: row.penalty_amount || null,
      tax_applicable: row.tax_applicable ?? true,
      interest_applicable: row.interest_applicable ?? true,
      penalty_applicable: row.penalty_applicable ?? true,
      workflow_step: row.workflow_step || 'notice'
    };
  }

  /**
   * Auto-advance workflow step based on actions
   */
  async autoAdvanceWorkflowStep(noticeId: string, toStep: 'reply' | 'hearing'): Promise<void> {
    try {
      const notice = await this.getNotice(noticeId);
      if (!notice) return;
      
      const stepOrder = ['notice', 'reply', 'hearing', 'closed'];
      const currentIndex = stepOrder.indexOf(notice.workflow_step || 'notice');
      const targetIndex = stepOrder.indexOf(toStep);
      
      if (targetIndex > currentIndex) {
        await this.updateNotice(noticeId, { workflow_step: toStep });
      }
    } catch (error) {
      console.error('[StageNoticesService] Failed to advance workflow step:', error);
    }
  }
}

export const stageNoticesService = new StageNoticesService();

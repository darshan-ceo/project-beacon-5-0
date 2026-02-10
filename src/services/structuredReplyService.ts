/**
 * Structured Reply Service
 * CRUD for structured_reply_details (appeal-level extended reply data)
 */

import { supabase } from '@/integrations/supabase/client';
import { StructuredReplyDetails, CreateStructuredReplyInput } from '@/types/structuredReply';
import { toast } from '@/hooks/use-toast';

class StructuredReplyService {
  async getByReplyId(replyId: string): Promise<StructuredReplyDetails | null> {
    try {
      const { data, error } = await supabase
        .from('structured_reply_details')
        .select('*')
        .eq('reply_id', replyId)
        .maybeSingle();

      if (error) throw error;
      return data ? this.mapRow(data) : null;
    } catch (error) {
      console.error('[StructuredReplyService] Failed to fetch:', error);
      return null;
    }
  }

  async save(input: CreateStructuredReplyInput): Promise<StructuredReplyDetails | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const payload = {
        tenant_id: profile.tenant_id,
        reply_id: input.reply_id,
        case_id: input.case_id,
        prepared_by: input.prepared_by || null,
        filed_by_name: input.filed_by_name || null,
        pre_deposit_pct: input.pre_deposit_pct ?? null,
        pre_deposit_amount: input.pre_deposit_amount ?? null,
        pre_deposit_remarks: input.pre_deposit_remarks || null,
        cross_obj_ref: input.cross_obj_ref || null,
        cross_obj_date: input.cross_obj_date || null,
        ack_reference_id: input.ack_reference_id || null,
        filing_proof_doc_ids: input.filing_proof_doc_ids || [],
        delay_reason: input.delay_reason || null,
        condonation_filed: input.condonation_filed || false,
        key_arguments: input.key_arguments || null,
        strength_weakness: input.strength_weakness || null,
        expected_outcome: input.expected_outcome || null,
        additional_submissions: input.additional_submissions || [],
      };

      // Check if record exists
      const { data: existing } = await supabase
        .from('structured_reply_details')
        .select('id')
        .eq('reply_id', input.reply_id)
        .maybeSingle();

      let data: any;
      let error: any;

      if (existing) {
        const result = await supabase
          .from('structured_reply_details')
          .update(payload as any)
          .eq('reply_id', input.reply_id)
          .select('*')
          .single();
        data = result.data;
        error = result.error;
      } else {
        const result = await supabase
          .from('structured_reply_details')
          .insert(payload as any)
          .select('*')
          .single();
        data = result.data;
        error = result.error;
      }

      if (error) throw error;
      return this.mapRow(data);
    } catch (error) {
      console.error('[StructuredReplyService] Failed to save:', error);
      toast({
        title: 'Error',
        description: 'Failed to save structured reply details.',
        variant: 'destructive',
      });
      return null;
    }
  }

  private mapRow(row: any): StructuredReplyDetails {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      reply_id: row.reply_id,
      case_id: row.case_id,
      prepared_by: row.prepared_by,
      filed_by_name: row.filed_by_name,
      pre_deposit_pct: row.pre_deposit_pct,
      pre_deposit_amount: row.pre_deposit_amount,
      pre_deposit_remarks: row.pre_deposit_remarks,
      cross_obj_ref: row.cross_obj_ref,
      cross_obj_date: row.cross_obj_date,
      ack_reference_id: row.ack_reference_id,
      filing_proof_doc_ids: Array.isArray(row.filing_proof_doc_ids) ? row.filing_proof_doc_ids : [],
      delay_reason: row.delay_reason,
      condonation_filed: row.condonation_filed ?? false,
      key_arguments: row.key_arguments,
      strength_weakness: row.strength_weakness,
      expected_outcome: row.expected_outcome,
      additional_submissions: Array.isArray(row.additional_submissions) ? row.additional_submissions : [],
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}

export const structuredReplyService = new StructuredReplyService();

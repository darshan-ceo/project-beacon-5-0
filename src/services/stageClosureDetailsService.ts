/**
 * Stage Closure Details Service
 * CRUD for the stage_closure_details table
 */

import { supabase } from '@/integrations/supabase/client';
import { StageClosureDetailsRecord, StageClosureFormData, TaxBreakdown, EMPTY_TAX_BREAKDOWN } from '@/types/stageClosureDetails';

class StageClosureDetailsService {
  /**
   * Calculate total demand from breakdown
   */
  private calculateTotalDemand(
    tax: TaxBreakdown,
    interest: number,
    penalty: number
  ): number {
    const taxTotal = (tax.igst || 0) + (tax.cgst || 0) + (tax.sgst || 0) + (tax.cess || 0);
    return taxTotal + (interest || 0) + (penalty || 0);
  }

  /**
   * Fetch saved closure details for a stage instance
   */
  async getByStageInstanceId(stageInstanceId: string): Promise<StageClosureDetailsRecord | null> {
    try {
      const { data, error } = await (supabase as any)
        .from('stage_closure_details')
        .select('*')
        .eq('stage_instance_id', stageInstanceId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        ...data,
        final_tax_amount: data.final_tax_amount || EMPTY_TAX_BREAKDOWN
      } as StageClosureDetailsRecord;
    } catch (error) {
      console.error('[StageClosureDetailsService] Failed to fetch:', error);
      return null;
    }
  }

  /**
   * Save (upsert) closure data as draft
   */
  async save(
    stageInstanceId: string,
    caseId: string,
    formData: StageClosureFormData
  ): Promise<StageClosureDetailsRecord | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();
      if (!profile) throw new Error('Profile not found');

      const isFullyDropped = formData.closure_status === 'Fully Dropped';
      const tax = isFullyDropped ? EMPTY_TAX_BREAKDOWN : formData.final_tax_amount;
      const interest = isFullyDropped ? 0 : formData.final_interest_amount;
      const penalty = isFullyDropped ? 0 : formData.final_penalty_amount;
      const totalDemand = this.calculateTotalDemand(tax, interest, penalty);

      const record = {
        tenant_id: profile.tenant_id,
        stage_instance_id: stageInstanceId,
        case_id: caseId,
        closure_status: formData.closure_status,
        closure_ref_no: formData.closure_ref_no || null,
        closure_date: formData.closure_date || null,
        issuing_authority: formData.issuing_authority || null,
        officer_name: formData.officer_name || null,
        officer_designation: formData.officer_designation || null,
        final_tax_amount: tax,
        final_interest_amount: interest,
        final_penalty_amount: penalty,
        final_total_demand: totalDemand,
        closure_notes: formData.closure_notes || null,
        is_draft: true
      };

      const { data, error } = await (supabase as any)
        .from('stage_closure_details')
        .upsert(record, { onConflict: 'stage_instance_id' })
        .select()
        .single();

      if (error) throw error;

      return {
        ...data,
        final_tax_amount: data.final_tax_amount || EMPTY_TAX_BREAKDOWN
      } as StageClosureDetailsRecord;
    } catch (error) {
      console.error('[StageClosureDetailsService] Failed to save:', error);
      throw error;
    }
  }

  /**
   * Finalize closure (set is_draft = false)
   */
  async finalize(stageInstanceId: string): Promise<boolean> {
    try {
      const { error } = await (supabase as any)
        .from('stage_closure_details')
        .update({ is_draft: false })
        .eq('stage_instance_id', stageInstanceId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('[StageClosureDetailsService] Failed to finalize:', error);
      return false;
    }
  }
}

export const stageClosureDetailsService = new StageClosureDetailsService();

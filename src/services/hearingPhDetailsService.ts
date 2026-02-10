import { supabase } from '@/integrations/supabase/client';
import { HearingPhDetails } from '@/types/hearingPhDetails';

export const hearingPhDetailsService = {
  async getByHearingId(hearingId: string): Promise<HearingPhDetails | null> {
    try {
      const { data, error } = await supabase
        .from('hearing_ph_details' as any)
        .select('*')
        .eq('hearing_id', hearingId)
        .maybeSingle();

      if (error) {
        console.error('[HearingPH] Failed to fetch PH details:', error);
        return null;
      }

      return data as unknown as HearingPhDetails | null;
    } catch (err) {
      console.error('[HearingPH] Error fetching PH details:', err);
      return null;
    }
  },

  async save(data: Omit<HearingPhDetails, 'id' | 'created_at' | 'updated_at'>): Promise<HearingPhDetails | null> {
    try {
      const { data: result, error } = await supabase
        .from('hearing_ph_details' as any)
        .upsert(
          {
            tenant_id: data.tenant_id,
            hearing_id: data.hearing_id,
            case_id: data.case_id,
            ph_notice_ref_no: data.ph_notice_ref_no,
            ph_notice_date: data.ph_notice_date,
            hearing_mode: data.hearing_mode || 'Physical',
            place_of_hearing: data.place_of_hearing || null,
            attended_by: data.attended_by || null,
            additional_submissions: JSON.stringify(data.additional_submissions || []),
          },
          { onConflict: 'hearing_id' }
        )
        .select()
        .single();

      if (error) {
        console.error('[HearingPH] Failed to save PH details:', error);
        return null;
      }

      return result as unknown as HearingPhDetails;
    } catch (err) {
      console.error('[HearingPH] Error saving PH details:', err);
      return null;
    }
  },

  async deleteByHearingId(hearingId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('hearing_ph_details' as any)
        .delete()
        .eq('hearing_id', hearingId);

      if (error) {
        console.error('[HearingPH] Failed to delete PH details:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('[HearingPH] Error deleting PH details:', err);
      return false;
    }
  }
};

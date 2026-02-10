/**
 * Personal Hearing (PH) Details - Extension table types
 * Linked 1:1 to hearings via hearing_id
 */

export interface HearingPhDetails {
  id: string;
  tenant_id: string;
  hearing_id: string;
  case_id: string;
  ph_notice_ref_no: string;
  ph_notice_date: string;
  hearing_mode: 'Physical' | 'Virtual';
  place_of_hearing: string | null;
  attended_by: string | null;
  additional_submissions: AdditionalSubmission[];
  created_at?: string;
  updated_at?: string;
}

export interface AdditionalSubmission {
  description: string;
  doc_id: string | null;
}

export interface HearingPhDetailsFormData {
  ph_notice_ref_no: string;
  ph_notice_date: string;
  hearing_mode: 'Physical' | 'Virtual';
  place_of_hearing: string;
  attended_by: string;
  additional_submissions: AdditionalSubmission[];
}

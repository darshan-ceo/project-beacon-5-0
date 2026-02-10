/**
 * Structured Reply Details Types
 * Extended reply data for appeal-level stages (First Appeal and above)
 */

export interface StructuredReplyDetails {
  id: string;
  tenant_id: string;
  reply_id: string;
  case_id: string;
  prepared_by: string | null;
  filed_by_name: string | null;
  pre_deposit_pct: number | null;
  pre_deposit_amount: number | null;
  pre_deposit_remarks: string | null;
  cross_obj_ref: string | null;
  cross_obj_date: string | null;
  ack_reference_id: string | null;
  filing_proof_doc_ids: string[];
  delay_reason: string | null;
  condonation_filed: boolean;
  key_arguments: string | null;
  strength_weakness: string | null;
  expected_outcome: string | null;
  additional_submissions: AdditionalSubmission[];
  created_at: string;
  updated_at: string;
}

export interface AdditionalSubmission {
  description: string;
  doc_id: string | null;
}

export interface CreateStructuredReplyInput {
  reply_id: string;
  case_id: string;
  prepared_by?: string;
  filed_by_name?: string;
  pre_deposit_pct?: number | null;
  pre_deposit_amount?: number | null;
  pre_deposit_remarks?: string;
  cross_obj_ref?: string;
  cross_obj_date?: string;
  ack_reference_id?: string;
  filing_proof_doc_ids?: string[];
  delay_reason?: string;
  condonation_filed?: boolean;
  key_arguments?: string;
  strength_weakness?: string;
  expected_outcome?: string;
  additional_submissions?: AdditionalSubmission[];
}

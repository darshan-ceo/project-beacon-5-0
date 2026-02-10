/**
 * Stage Closure Details Types
 * For the enhanced closure form with demand breakdown
 */

export type ClosureStatus = 'Order Passed' | 'Fully Dropped' | 'Withdrawn' | 'Settled' | 'Remanded';

export interface TaxBreakdown {
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
}

export interface StageClosureDetailsRecord {
  id: string;
  tenant_id: string;
  stage_instance_id: string;
  case_id: string;
  closure_status: ClosureStatus;
  closure_ref_no: string | null;
  closure_date: string | null;
  issuing_authority: string | null;
  officer_name: string | null;
  officer_designation: string | null;
  final_tax_amount: TaxBreakdown;
  final_interest_amount: number;
  final_penalty_amount: number;
  final_total_demand: number;
  closure_notes: string | null;
  is_draft: boolean;
  created_at: string;
  updated_at: string;
}

export interface StageClosureFormData {
  closure_status: ClosureStatus | '';
  closure_ref_no: string;
  closure_date: string;
  issuing_authority: string;
  officer_name: string;
  officer_designation: string;
  final_tax_amount: TaxBreakdown;
  final_interest_amount: number;
  final_penalty_amount: number;
  interest_applicable: boolean;
  penalty_applicable: boolean;
  closure_notes: string;
}

export const EMPTY_TAX_BREAKDOWN: TaxBreakdown = { igst: 0, cgst: 0, sgst: 0, cess: 0 };

export const INITIAL_CLOSURE_FORM: StageClosureFormData = {
  closure_status: '',
  closure_ref_no: '',
  closure_date: '',
  issuing_authority: '',
  officer_name: '',
  officer_designation: '',
  final_tax_amount: { ...EMPTY_TAX_BREAKDOWN },
  final_interest_amount: 0,
  final_penalty_amount: 0,
  interest_applicable: true,
  penalty_applicable: true,
  closure_notes: ''
};

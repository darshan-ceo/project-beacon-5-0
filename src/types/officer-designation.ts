// Tax Jurisdiction type - CGST (Central) or SGST (State)
export type TaxJurisdiction = 'CGST' | 'SGST';

// Officer Designation type - All possible officer levels
export type OfficerDesignation =
  | 'PRINCIPAL_COMMISSIONER'  // CGST only
  | 'COMMISSIONER'
  | 'ADDITIONAL_COMMISSIONER'
  | 'JOINT_COMMISSIONER'
  | 'DEPUTY_COMMISSIONER'
  | 'ASSISTANT_COMMISSIONER'
  | 'SUPERINTENDENT'          // CGST only
  | 'STATE_TAX_OFFICER';      // SGST only

// Officer option interface for dropdowns
export interface OfficerOption {
  value: OfficerDesignation;
  label: string;
  order: number;
}

// CGST Officers list (in hierarchical order - highest to lowest)
export const CGST_OFFICERS: OfficerOption[] = [
  { value: 'PRINCIPAL_COMMISSIONER', label: 'Principal Commissioner', order: 1 },
  { value: 'COMMISSIONER', label: 'Commissioner', order: 2 },
  { value: 'ADDITIONAL_COMMISSIONER', label: 'Additional Commissioner', order: 3 },
  { value: 'JOINT_COMMISSIONER', label: 'Joint Commissioner', order: 4 },
  { value: 'DEPUTY_COMMISSIONER', label: 'Deputy Commissioner', order: 5 },
  { value: 'ASSISTANT_COMMISSIONER', label: 'Assistant Commissioner', order: 6 },
  { value: 'SUPERINTENDENT', label: 'Superintendent', order: 7 }
];

// SGST Officers list (in hierarchical order - highest to lowest)
export const SGST_OFFICERS: OfficerOption[] = [
  { value: 'COMMISSIONER', label: 'Commissioner', order: 1 },
  { value: 'ADDITIONAL_COMMISSIONER', label: 'Additional Commissioner', order: 2 },
  { value: 'JOINT_COMMISSIONER', label: 'Joint Commissioner', order: 3 },
  { value: 'DEPUTY_COMMISSIONER', label: 'Deputy Commissioner', order: 4 },
  { value: 'ASSISTANT_COMMISSIONER', label: 'Assistant Commissioner', order: 5 },
  { value: 'STATE_TAX_OFFICER', label: 'State Tax Officer', order: 6 }
];

// Tax Jurisdiction options for dropdown
export const TAX_JURISDICTION_OPTIONS: { value: TaxJurisdiction; label: string; description: string }[] = [
  { value: 'CGST', label: 'CGST', description: 'Central Goods and Services Tax' },
  { value: 'SGST', label: 'SGST', description: 'State Goods and Services Tax' }
];

// Metadata for all officer designations
export const OFFICER_DESIGNATION_METADATA: Record<OfficerDesignation, { 
  label: string; 
  cgst: boolean; 
  sgst: boolean;
  description: string;
}> = {
  PRINCIPAL_COMMISSIONER: { 
    label: 'Principal Commissioner', 
    cgst: true, 
    sgst: false,
    description: 'Highest ranking CGST officer at zonal level'
  },
  COMMISSIONER: { 
    label: 'Commissioner', 
    cgst: true, 
    sgst: true,
    description: 'Head of Commissionerate'
  },
  ADDITIONAL_COMMISSIONER: { 
    label: 'Additional Commissioner', 
    cgst: true, 
    sgst: true,
    description: 'Senior officer supporting Commissioner'
  },
  JOINT_COMMISSIONER: { 
    label: 'Joint Commissioner', 
    cgst: true, 
    sgst: true,
    description: 'Mid-senior level officer'
  },
  DEPUTY_COMMISSIONER: { 
    label: 'Deputy Commissioner', 
    cgst: true, 
    sgst: true,
    description: 'Division level officer'
  },
  ASSISTANT_COMMISSIONER: { 
    label: 'Assistant Commissioner', 
    cgst: true, 
    sgst: true,
    description: 'Range level officer'
  },
  SUPERINTENDENT: { 
    label: 'Superintendent', 
    cgst: true, 
    sgst: false,
    description: 'CGST field officer'
  },
  STATE_TAX_OFFICER: { 
    label: 'State Tax Officer', 
    cgst: false, 
    sgst: true,
    description: 'SGST field officer'
  }
};

// Helper function to get officers by jurisdiction
export const getOfficersByJurisdiction = (jurisdiction: TaxJurisdiction | undefined): OfficerOption[] => {
  if (jurisdiction === 'CGST') return CGST_OFFICERS;
  if (jurisdiction === 'SGST') return SGST_OFFICERS;
  return [];
};

// Helper function to get officer label
export const getOfficerLabel = (designation: OfficerDesignation | undefined): string => {
  if (!designation) return 'N/A';
  return OFFICER_DESIGNATION_METADATA[designation]?.label || designation;
};

// Helper function to get jurisdiction label
export const getJurisdictionLabel = (jurisdiction: TaxJurisdiction | undefined): string => {
  if (!jurisdiction) return 'N/A';
  const option = TAX_JURISDICTION_OPTIONS.find(opt => opt.value === jurisdiction);
  return option?.label || jurisdiction;
};

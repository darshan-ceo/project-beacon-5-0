export interface CompanySignatory {
  id: string;
  clientId: string;
  fullName: string;
  designation: string;
  email: string;
  phone: string;
  signingScope: SigningScope[];
  isPrimary: boolean;
  validFrom?: string;
  validTo?: string;
  status: 'Active' | 'Inactive';
  notes?: string;
  proofFileId?: string;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
}

export type SigningScope = 
  | 'All'
  | 'GST Filings'
  | 'Litigation'
  | 'Appeals'
  | 'Billing'
  | 'Other';

export const SIGNING_SCOPE_OPTIONS: { value: SigningScope; label: string }[] = [
  { value: 'All', label: 'All Documents' },
  { value: 'GST Filings', label: 'GST Filings' },
  { value: 'Litigation', label: 'Litigation' },
  { value: 'Appeals', label: 'Appeals' },
  { value: 'Billing', label: 'Billing' },
  { value: 'Other', label: 'Other' }
];
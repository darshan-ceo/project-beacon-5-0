/**
 * GST Compliance Types
 * Types for MasterGST API integration and GST compliance tracking
 */

export interface GstCredential {
  id: string;
  tenantId: string;
  clientId: string;
  gstin: string;
  
  // Consent Information
  consentId?: string;
  consentStatus: 'pending' | 'active' | 'expired' | 'revoked';
  consentGrantedAt?: string;
  consentValidTill?: string;
  consentRevokedAt?: string;
  
  // OAuth Tokens (encrypted at application level)
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: string;
  
  // GSP Profile Data (cached)
  registeredEmail?: string;
  registeredMobile?: string;
  filingFrequency?: 'Monthly' | 'Quarterly';
  aatoBand?: string;
  eInvoiceEnabled: boolean;
  eWayBillEnabled: boolean;
  authorizedSignatories: any[];
  
  // Metadata
  lastSync?: string;
  syncError?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface GstReturnStatus {
  id: string;
  tenantId: string;
  clientId: string;
  gstin: string;
  
  // Return Information
  returnType: 'GSTR-1' | 'GSTR-3B' | 'GSTR-9' | 'GSTR-9C' | 'CMP-08';
  returnPeriod: string; // Format: MMYYYY (e.g., 112024)
  financialYear?: string; // e.g., 2024-25
  
  // Filing Status
  filingStatus: 'pending' | 'filed' | 'late_filed' | 'not_required' | 'not_applicable';
  filingDate?: string;
  dueDate?: string;
  isOverdue: boolean;
  
  // Liability Information
  taxLiability?: number;
  taxPaid?: number;
  lateFee?: number;
  interest?: number;
  
  // ARN and Reference
  arn?: string;
  referenceId?: string;
  
  // Sync Metadata
  lastSyncedAt?: string;
  syncSource: 'manual' | 'api' | 'gsp';
  syncError?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// Request/Response types for API operations
export interface CreateGstCredentialRequest {
  clientId: string;
  gstin: string;
  consentId?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: string;
}

export interface UpdateGstCredentialRequest {
  consentStatus?: 'pending' | 'active' | 'expired' | 'revoked';
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: string;
  registeredEmail?: string;
  registeredMobile?: string;
  filingFrequency?: 'Monthly' | 'Quarterly';
  aatoBand?: string;
  eInvoiceEnabled?: boolean;
  eWayBillEnabled?: boolean;
  authorizedSignatories?: any[];
  lastSync?: string;
  syncError?: string;
}

export interface CreateReturnStatusRequest {
  clientId: string;
  gstin: string;
  returnType: 'GSTR-1' | 'GSTR-3B' | 'GSTR-9' | 'GSTR-9C' | 'CMP-08';
  returnPeriod: string;
  financialYear?: string;
  filingStatus?: 'pending' | 'filed' | 'late_filed' | 'not_required' | 'not_applicable';
  dueDate?: string;
}

export interface UpdateReturnStatusRequest {
  filingStatus?: 'pending' | 'filed' | 'late_filed' | 'not_required' | 'not_applicable';
  filingDate?: string;
  dueDate?: string;
  isOverdue?: boolean;
  taxLiability?: number;
  taxPaid?: number;
  lateFee?: number;
  interest?: number;
  arn?: string;
  referenceId?: string;
  lastSyncedAt?: string;
  syncSource?: 'manual' | 'api' | 'gsp';
  syncError?: string;
}

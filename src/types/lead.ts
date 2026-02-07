/**
 * Inquiry/CRM Type Definitions
 * For managing inquiries within the client_contacts table
 * 
 * Note: Internal field names remain as "lead_*" for database compatibility,
 * but UI terminology uses "Inquiry" language for legal firm context
 */

// Simplified 4-status flow for legal firm inquiries
export type LeadStatus = 'new' | 'follow_up' | 'converted' | 'not_proceeding';

// Legacy status mapping for backward compatibility
export const mapLegacyStatus = (status: string | null): LeadStatus => {
  if (!status) return 'new';
  const mapping: Record<string, LeadStatus> = {
    'new': 'new',
    'contacted': 'follow_up',
    'qualified': 'follow_up',
    'proposal_sent': 'follow_up',
    'negotiation': 'follow_up',
    'follow_up': 'follow_up',
    'won': 'converted',
    'converted': 'converted',
    'lost': 'not_proceeding',
    'not_proceeding': 'not_proceeding',
  };
  return mapping[status] || 'new';
};

export type LeadSource = 
  | 'ca_reference' 
  | 'referral' 
  | 'walk_in' 
  | 'website' 
  | 'existing_client' 
  | 'other';

export type InquiryType = 
  | 'gst_notice' 
  | 'appeal' 
  | 'advisory';

export type ActivityType = 'call' | 'email' | 'meeting' | 'note' | 'task' | 'status_change' | 'conversion';

export interface Lead {
  id: string;
  tenant_id: string;
  client_id: string | null;
  name: string;
  designation?: string | null; // Used to store inquiry type
  emails?: EmailEntry[] | null;
  phones?: PhoneEntry[] | null;
  roles: string[];
  is_primary?: boolean;
  is_active?: boolean;
  source?: string | null;
  notes?: string | null;
  owner_user_id?: string | null;
  data_scope?: 'ALL' | 'OWN' | 'TEAM' | null;
  
  // CRM/Inquiry Fields (internal names kept for DB compatibility)
  lead_status: LeadStatus | null;
  lead_source: LeadSource | string | null;
  lead_score: number; // Deprecated - kept for backward compatibility
  expected_value: number | null; // Optional, not displayed prominently
  expected_close_date: string | null; // Deprecated
  lost_reason: string | null; // Renamed conceptually to "not_proceeding_reason"
  converted_at: string | null;
  last_activity_at: string | null;
  
  created_at?: string;
  updated_at?: string;
}

export interface EmailEntry {
  email: string;
  type?: string;
  isPrimary?: boolean;
}

export interface PhoneEntry {
  number: string;
  countryCode?: string;
  type?: string;
  isPrimary?: boolean;
  isWhatsApp?: boolean;
}

export interface LeadActivity {
  id: string;
  tenant_id: string;
  contact_id: string;
  activity_type: ActivityType;
  subject?: string | null;
  description?: string | null;
  outcome?: string | null;
  next_action?: string | null;
  next_action_date?: string | null;
  created_by?: string | null;
  created_at: string;
  
  // Joined fields
  created_by_name?: string;
}

export interface LeadFilters {
  status?: LeadStatus | LeadStatus[];
  source?: LeadSource | string;
  owner_user_id?: string;
  min_score?: number;
  max_score?: number;
  search?: string;
  date_from?: string;
  date_to?: string;
}

export interface PipelineStats {
  total_leads: number;
  total_value: number;
  by_status: {
    status: LeadStatus;
    count: number;
    value: number;
  }[];
  conversion_rate: number;
  avg_deal_value: number;
  // New inquiry-focused metrics
  active_inquiries: number;
  follow_ups_pending: number;
  converted_this_month: number;
  inquiries_this_month: number;
}

export interface ConversionOptions {
  clientData: {
    display_name: string;
    type?: string;
    gstin?: string;
    pan?: string;
    email?: string;
    phone?: string;
    address?: any;
    state?: string;
    city?: string;
  };
  createFirstCase?: boolean;
  caseData?: {
    title: string;
    description?: string;
  };
}

export interface ConversionResult {
  success: boolean;
  client?: any;
  contact?: Lead;
  case?: any;
  error?: string;
}

// Simplified 4-status configuration for legal firm inquiry flow
export const LEAD_STATUS_CONFIG: Record<LeadStatus, { 
  label: string; 
  color: string; 
  bgColor: string;
  order: number;
}> = {
  new: { 
    label: 'New', 
    color: 'text-blue-700', 
    bgColor: 'bg-blue-100',
    order: 1 
  },
  follow_up: { 
    label: 'Follow-up', 
    color: 'text-amber-700', 
    bgColor: 'bg-amber-100',
    order: 2 
  },
  converted: { 
    label: 'Converted', 
    color: 'text-green-700', 
    bgColor: 'bg-green-100',
    order: 3 
  },
  not_proceeding: { 
    label: 'Not Proceeding', 
    color: 'text-gray-700', 
    bgColor: 'bg-gray-100',
    order: 4 
  },
};

// Legal-context source options
export const LEAD_SOURCE_OPTIONS: { value: LeadSource; label: string }[] = [
  { value: 'ca_reference', label: 'CA / Reference' },
  { value: 'referral', label: 'Referral' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'website', label: 'Website' },
  { value: 'existing_client', label: 'Existing Client' },
  { value: 'other', label: 'Other' },
];

// Inquiry type options for GST litigation context
export const INQUIRY_TYPE_OPTIONS: { value: InquiryType; label: string }[] = [
  { value: 'gst_notice', label: 'GST Notice' },
  { value: 'appeal', label: 'Appeal' },
  { value: 'advisory', label: 'Advisory / Consultation' },
];

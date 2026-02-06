/**
 * Lead/CRM Type Definitions
 * For managing leads within the client_contacts table
 */

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal_sent' | 'negotiation' | 'won' | 'lost';

export type LeadSource = 
  | 'referral' 
  | 'website' 
  | 'cold_call' 
  | 'advertisement' 
  | 'social_media' 
  | 'seminar' 
  | 'existing_client' 
  | 'other';

export type ActivityType = 'call' | 'email' | 'meeting' | 'note' | 'task' | 'status_change' | 'conversion';

export interface Lead {
  id: string;
  tenant_id: string;
  client_id: string | null;
  name: string;
  designation?: string | null;
  emails?: EmailEntry[] | null;
  phones?: PhoneEntry[] | null;
  roles: string[];
  is_primary?: boolean;
  is_active?: boolean;
  source?: string | null;
  notes?: string | null;
  owner_user_id?: string | null;
  data_scope?: 'ALL' | 'OWN' | 'TEAM' | null;
  
  // CRM Fields
  lead_status: LeadStatus | null;
  lead_source: LeadSource | string | null;
  lead_score: number;
  expected_value: number | null;
  expected_close_date: string | null;
  lost_reason: string | null;
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
  contacted: { 
    label: 'Contacted', 
    color: 'text-purple-700', 
    bgColor: 'bg-purple-100',
    order: 2 
  },
  qualified: { 
    label: 'Qualified', 
    color: 'text-amber-700', 
    bgColor: 'bg-amber-100',
    order: 3 
  },
  proposal_sent: { 
    label: 'Proposal Sent', 
    color: 'text-orange-700', 
    bgColor: 'bg-orange-100',
    order: 4 
  },
  negotiation: { 
    label: 'Negotiation', 
    color: 'text-cyan-700', 
    bgColor: 'bg-cyan-100',
    order: 5 
  },
  won: { 
    label: 'Won', 
    color: 'text-green-700', 
    bgColor: 'bg-green-100',
    order: 6 
  },
  lost: { 
    label: 'Lost', 
    color: 'text-red-700', 
    bgColor: 'bg-red-100',
    order: 7 
  },
};

export const LEAD_SOURCE_OPTIONS: { value: LeadSource; label: string }[] = [
  { value: 'referral', label: 'Referral' },
  { value: 'website', label: 'Website' },
  { value: 'cold_call', label: 'Cold Call' },
  { value: 'advertisement', label: 'Advertisement' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'seminar', label: 'Seminar/Event' },
  { value: 'existing_client', label: 'Existing Client' },
  { value: 'other', label: 'Other' },
];

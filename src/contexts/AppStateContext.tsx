import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { calendarSyncService } from '@/services/calendar/calendarSyncService';
import { useSyncPersistentDispatch } from '@/hooks/usePersistentDispatch';

// Types
interface GeneratedForm {
  formCode: string;
  version: number;
  generatedDate: string;
  employeeId: string;
  employeeName: string;
  documentId?: string;
  fileName: string;
  status: 'Generated' | 'Uploaded';
}

interface Case {
  id: string;
  caseNumber: string;
  title: string;
  clientId: string; // FK to Client.id
  currentStage: string; // Sync with AuthorityLevel from Legal Authorities master
  priority: 'High' | 'Medium' | 'Low';
  timelineBreachStatus: 'Green' | 'Amber' | 'Red';
  status?: 'Active' | 'Completed';
  completedDate?: string;
  reviewDate?: string;
  nextHearing?: {
    date: string;
    courtId: string; // FK to Court.id
    judgeId: string; // FK to Judge.id
    type: 'Adjourned' | 'Final' | 'Argued';
  };
  assignedToId: string; // FK to Employee.id
  assignedTo?: string; // Database field mapping (same as assignedToId)
  assignedToName: string; // Display name derived from Employee
  createdDate: string;
  lastUpdated: string;
  documents: number;
  progress: number;
  generatedForms: GeneratedForm[]; // Track completed forms
  amountInDispute?: number; // Amount in dispute for GST cases
  description?: string; // Case description
  
  // NEW FIELDS - Client Request Updates
  caseType?: 'GST' | 'ST' | 'Excise' | 'Custom' | 'VAT' | 'DGFT'; // Case type taxonomy
  issueType?: string; // Issue/matter name (used with client name for title)
  caseYear?: string; // Year component of case number
  caseSequence?: string; // Sequence number within year
  officeFileNo?: string; // Office file reference number
  noticeNo?: string; // Notice reference number (legacy - use notice_no)
  period?: string; // Tax period (e.g., "Q1 FY2024-25")
  taxDemand?: number; // Tax amount in dispute
  authority?: string; // Issuing authority name (legacy - use authorityId)
  jurisdictionalCommissionerate?: string; // Jurisdictional office
  departmentLocation?: string; // Department location
  matterType?: 'Scrutiny' | 'General Inquiry' | 'Audit' | 'Investigation' | 'Refund' | 'Advance Ruling' | 'Amnesty' | 'E-waybill'; // Matter type for Assessment stage
  tribunalBench?: 'State Bench' | 'Principal Bench'; // Tribunal bench selection for routing
  
  // Phase 1: GST Metadata Fields for Production Readiness
  notice_no?: string; // Notice number from GST department (e.g., "ZA270325006940Y")
  form_type?: 'DRC-01' | 'DRC-03' | 'DRC-07' | 'ASMT-10' | 'ASMT-11' | 'ASMT-12' | 'SCN' | 'Other'; // GST form type
  section_invoked?: string; // GST Act section (e.g., "Section 73", "Section 74")
  financial_year?: string; // FY format "FY 2024-25"
  authorityId?: string; // FK to Court.id (preferred over authority string)
  city?: string; // City for jurisdiction (mandatory for cases beyond Assessment)
  
  // Phase 2: Legal Forum Integration
  forumId?: string; // FK to Court.id - Legal forum/authority handling the case
  authorityLevel?: string; // Auto-filled authority level from selected forum (e.g., "ADJUDICATION", "FIRST_APPEAL")
  specificOfficer?: string; // Name of specific officer at the forum (e.g., "Shri Rajesh Kumar, Deputy Commissioner")
  
  // Phase 3: Compliance & Financial Tracking (Comprehensive Plan Implementation)
  notice_date?: string; // YYYY-MM-DD - Date when notice was issued by the department
  noticeDate?: string; // CamelCase variant for notice_date
  reply_due_date?: string; // YYYY-MM-DD - Deadline to respond to notice
  replyDueDate?: string; // CamelCase variant for reply_due_date
  interest_amount?: number; // Interest demanded by the department
  interestAmount?: number; // CamelCase variant for interest_amount
  penalty_amount?: number; // Penalty amount proposed/imposed
  penaltyAmount?: number; // CamelCase variant for penalty_amount
  total_demand?: number; // Computed: tax + interest + penalty
  totalDemand?: number; // CamelCase variant for total_demand
  
  // Phase 4: State Bench Location Enhancement (GSTAT Notification Compliance)
  stateBenchState?: string; // State selection for State Bench cases (e.g., "Gujarat", "Maharashtra")
  stateBenchCity?: string; // City selection for State Bench cases (e.g., "Ahmedabad", "Mumbai")
  
  // Backward compatibility
  slaStatus?: 'Green' | 'Amber' | 'Red'; // Deprecated: use timelineBreachStatus
}

interface Task {
  id: string;
  title: string;
  description: string;
  caseId: string; // FK to Case.id (required)
  clientId: string; // Derived from Case.clientId (auto-populated, read-only)
  caseNumber: string; // Derived from Case.caseNumber (auto-populated)
  stage: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Not Started' | 'In Progress' | 'Review' | 'Completed' | 'Overdue';
  assignedToId: string; // FK to Employee.id
  assignedToName: string; // Display name derived from Employee
  assignedById: string; // FK to Employee.id
  assignedByName: string; // Display name derived from Employee
  createdDate: string;
  dueDate: string;
  completedDate?: string;
  estimatedHours: number;
  actualHours?: number;
  isAutoGenerated: boolean;
  bundleId?: string;
  dependencies?: string[];
  taskCategory?: string; // Category from employee's default or template
  attachments?: string[];
  escalationLevel: 0 | 1 | 2 | 3;
  followUpDate?: string; // Next follow-up date (legacy - use currentFollowUpDate)
  
  // Phase 1: Follow-up system enhancements
  isLocked?: boolean; // Task locked after first follow-up
  lockedAt?: string; // When task was locked
  lockedBy?: string; // User ID who created first follow-up
  currentFollowUpDate?: string; // Current follow-up date from latest follow-up
  
  // Phase 1: Core Stabilization & Data Integrity
  hearing_id?: string; // FK to Hearing.id (optional - for hearing-triggered tasks)
  hearingDate?: string; // Derived from Hearing.date (YYYY-MM-DD format)
  timezone: string; // Default 'Asia/Kolkata' (IST) - explicit timezone tracking
  dueDateValidated: boolean; // Flag indicating date has been validated against YYYY-MM-DD format
  slaDeadline?: string; // Calculated SLA deadline from case SLA settings (YYYY-MM-DD)
  slaBuffer?: number; // Hours before deadline to show warning (default 24)
  slaStatus?: 'on_track' | 'at_risk' | 'breached'; // Calculated SLA status
  audit_trail: {
    created_by: string; // User ID who created the task
    created_at: string; // ISO timestamp of creation
    updated_by: string; // User ID who last updated the task
    updated_at: string; // ISO timestamp of last update
    change_log: Array<{
      field: string; // Field name that changed
      old_value: any; // Previous value
      new_value: any; // New value
      changed_by: string; // User ID who made the change
      changed_at: string; // ISO timestamp of change
    }>;
  };
}

// Task Follow-Up interface - First-class entity for follow-up records
export interface TaskFollowUp {
  id: string;
  taskId: string; // FK to Task.id
  
  // Follow-up details
  remarks: string; // What was done/observed (required)
  outcome?: 'Progressing' | 'Blocked' | 'Completed' | 'Need Support' | 'Pending Input';
  status: Task['status']; // Status after this follow-up
  
  // Time tracking
  hoursLogged?: number;
  workDate: string; // Date when work was done
  
  // Next actions
  nextFollowUpDate?: string; // When to follow up again
  nextActions?: string; // What needs to be done next
  
  // Blockers/Issues
  blockers?: string;
  supportNeeded?: boolean;
  escalationRequested?: boolean;
  
  // Attachments
  attachments?: string[]; // File IDs/paths
  
  // Metadata
  createdBy: string; // Employee ID
  createdByName: string;
  createdAt: string; // When follow-up was logged
  
  // Optional fields
  clientInteraction?: boolean; // Was there client communication?
  internalReview?: boolean; // Was this reviewed internally?
}

// Task Note/Activity interface
export interface TaskNote {
  id: string;
  taskId: string;
  type: 'comment' | 'status_change' | 'time_log' | 'follow_up';
  note: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  metadata?: {
    oldStatus?: string;
    newStatus?: string;
    hours?: number;
    followUpDate?: string;
  };
}

// Client Group interface for organizing clients by business group
export interface ClientGroup {
  id: string;
  name: string; // e.g., "Landmark Group", "Tata Group"
  code: string; // Auto-generated slug: "landmark_group"
  description?: string;
  headClientId?: string; // FK to Client.id - main client of the group
  totalClients: number; // Computed: count of linked clients
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

interface Client {
  id: string;
  name: string;
  type: string; // Uses CLIENT_TYPES from appConfig - 16 GST portal types
  category?: 'Regular Dealer' | 'Composition' | 'Exporter' | 'Service' | 'Other';
  registrationNo?: string;
  gstin?: string;
  pan: string;
  state?: string; // Top-level state field for imported clients
  address: Address | string | any; // Support both new and legacy format plus enhanced
  jurisdiction?: Jurisdiction;
  portalAccess?: PortalAccess;
  signatories?: Signatory[];
  status: 'Active' | 'Inactive';
  assignedCAId: string; // FK to Employee.id  
  assignedCAName: string; // Display name derived from Employee
  clientGroupId?: string; // FK to ClientGroup.id
  createdAt?: string;
  updatedAt?: string;
  // Dual Access Model fields
  ownerId?: string; // FK to profiles.id - Owner user ID
  ownerName?: string; // Display name of owner (derived)
  dataScope?: 'OWN' | 'TEAM' | 'ALL'; // Entity-level data visibility scope
  // Migration flags
  needsAddressReview?: boolean;
  needsSignatoryReview?: boolean;
  // Legacy support
  email?: string;
  phone?: string;
  registrationNumber?: string;
  panNumber?: string;
  gstNumber?: string;
  registrationDate?: string;
  totalCases?: number;
  activeCases?: number;
  totalInvoiced?: number;
}

interface Court {
  id: string;
  name: string;
  type: 'Supreme Court' | 'High Court' | 'District Court' | 'Tribunal' | 'Commission';
  authorityLevel?: 'ASSESSMENT' | 'ADJUDICATION' | 'FIRST_APPEAL' | 'REVISIONAL' | 'TRIBUNAL' | 'PRINCIPAL_BENCH' | 'HIGH_COURT' | 'SUPREME_COURT';
  matterTypes?: string[]; // IDs of applicable matter types for this court/forum
  jurisdiction: string;
  address: string | any;
  activeCases: number;
  avgHearingTime: string;
  digitalFiling: boolean;
  digitalFilingPortal?: string; // Name of digital filing portal (e.g., "ACES", "GST Portal")
  digitalFilingPortalUrl?: string; // URL to the digital filing portal
  digitalFilingInstructions?: string; // Instructions for digital filing
  workingDays: string[];
  addressId?: string;
  phone?: string;
  email?: string;
  benchLocation?: string;
  city: string; // Mandatory for data quality - Phase 2
  status: 'Active' | 'Inactive';
  // NEW: CGST/SGST Officer Designation fields
  taxJurisdiction?: 'CGST' | 'SGST'; // Tax jurisdiction (Central or State)
  officerDesignation?: string; // Officer rank (e.g., DEPUTY_COMMISSIONER, JOINT_COMMISSIONER)
}

interface Judge {
  id: string;
  name: string;
  designation: string;
  status: 'Active' | 'On Leave' | 'Retired' | 'Transferred' | 'Deceased';
  courtId: string; // FK to Court.id
  bench?: string;
  jurisdiction?: string;
  city?: string;
  state?: string;
  photoUrl?: string;
  appointmentDate: string;
  retirementDate?: string;
  yearsOfService?: number; // computed field
  specialization: string[]; // from Admin taxonomy
  chambers?: string;
  email?: string;
  phone?: string;
  assistant?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  address?: any; // Support both legacy string and enhanced address for address master integration
  availability?: {
    days?: ('Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat')[];
    startTime?: string; // 24h format
    endTime?: string; // 24h format
    notes?: string;
  };
  tags?: string[];
  notes?: string;
  
  // PHASE 1: GST Compliance Fields
  memberType?: 'Judicial' | 'Technical-Centre' | 'Technical-State' | 'President' | 'Vice President' | 'Not Applicable';
  authorityLevel?: 'ADJUDICATION' | 'FIRST_APPEAL' | 'TRIBUNAL' | 'HIGH_COURT' | 'SUPREME_COURT';
  qualifications?: {
    educationalQualification?: string;
    yearsOfExperience?: number;
    previousPosition?: string;
    specialization?: string;
    governmentNominee?: 'Centre' | 'State' | 'None';
  };
  tenureDetails?: {
    tenureStartDate?: string;
    tenureEndDate?: string;
    maxTenureYears?: number;
    extensionGranted?: boolean;
    ageLimit?: number;
  };
  
  // Legacy fields for backwards compatibility
  totalCases?: number;
  avgDisposalTime?: string;
  contactInfo?: {
    chambers: string;
    phone?: string;
    email?: string;
  };
  addressId?: string; // For address master integration
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  // Resolved user names for display
  createdByName?: string;
  updatedByName?: string;
}

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  caseId: string; // FK to Case.id (optional - document may be client-only)
  clientId: string; // Can be direct association or derived from Case.clientId
  uploadedById: string; // FK to Employee.id
  uploadedByName: string; // Display name derived from Employee
  uploadedAt: string;
  createdAt?: string; // Make optional for backwards compatibility
  tags: string[];
  isShared: boolean;
  path: string;
  content?: string; // Base64 encoded file content
  folderId?: string; // Associated folder ID
  category?: string; // Document category for classification
}

// Employee interface for universal assignment system
export interface Employee {
  id: string;
  full_name: string;
  role: 'Partner' | 'CA' | 'Advocate' | 'Manager' | 'Staff' | 'RM' | 'Finance' | 'Admin';
  email: string;
  mobile?: string;
  status: 'Active' | 'Inactive' | 'Suspended';
  date_of_joining?: string;
  notes?: string;
  department: string;
  workloadCapacity: number;
  specialization?: string[];
  managerId?: string;
  tenantId?: string;
  address?: any;
  addressId?: string;
  
  // Personal Tab
  employeeCode?: string;
  profilePhoto?: string;
  gender?: 'Male' | 'Female' | 'Other';
  dob?: string;
  pan?: string;
  aadhaar?: string;
  bloodGroup?: 'A+' | 'A-' | 'B+' | 'B-' | 'O+' | 'O-' | 'AB+' | 'AB-';
  
  // Contact Tab
  officialEmail?: string;
  personalEmail?: string;
  alternateContact?: string;
  currentAddress?: string;
  permanentAddress?: string;
  city?: string;
  state?: string;
  pincode?: string;
  
  // Employment Tab
  designation?: string;
  reportingTo?: string;
  branch?: string;
  employmentType?: 'Permanent' | 'Contract' | 'Intern' | 'Consultant';
  confirmationDate?: string;
  weeklyOff?: 'Sunday' | 'Alternate Saturday' | 'Custom';
  weeklyOffDays?: string[]; // Array of selected days when weeklyOff is 'Custom'
  workShift?: 'Regular' | 'Remote' | 'Flexible';
  
  // Credentials Tab
  barCouncilNo?: string;
  icaiNo?: string;
  gstPractitionerId?: string;
  qualification?: string;
  experienceYears?: number;
  areasOfPractice?: string[];
  university?: string;
  graduationYear?: number;
  
  // Billing Tab
  billingRate?: number;
  billable?: boolean;
  defaultTaskCategory?: string;
  incentiveEligible?: boolean;
  
  // Access Tab
  moduleAccess?: string[];
  dataScope?: 'Own Cases' | 'Team Cases' | 'All Cases';
  aiAccess?: boolean;
  whatsappAccess?: boolean;
  
  // Documents Tab (DMS references)
  documents?: {
    resume?: string;
    idProof?: string;
    addressProof?: string;
    barOrIcaiCert?: string;
    nda?: string;
    offerLetter?: string;
  };
  
  // Audit Tab
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
}

// Enhanced Hearing interface with lifecycle integration
interface Hearing {
  id: string;
  case_id: string;
  stage_instance_id?: string;
  cycle_no?: number;
  date: string;
  start_time: string;
  end_time: string;
  timezone: string;
  court_id: string;
  court_name?: string;
  courtroom?: string;
  judge_ids: string[];
  judge_name?: string;
  purpose: 'PH' | 'mention' | 'final' | 'other';
  status: 'scheduled' | 'concluded' | 'adjourned' | 'no-board' | 'withdrawn';
  outcome?: 'Adjournment' | 'Submission Done' | 'Order Passed' | 'Closed' | 'Part-heard' | 'Allowed' | 'Dismissed' | 'Withdrawn' | 'Other';
  outcome_text?: string;
  next_hearing_date?: string;
  order_file_id?: string;
  notes?: string;
  attendance?: {
    our_counsel_id?: string;
    opposite_counsel?: string;
    client_rep?: string;
  };
  reminders?: {
    created: string[];
    last_sent_at?: string;
  };
  created_by: string;
  created_at: string;
  updated_at: string;
  
  // Phase 1: Authority & Forum Integration
  authority_id?: string;
  forum_id?: string;
  authority_name?: string;
  forum_name?: string;
  bench_details?: string;
  
  // Legacy compatibility
  caseId?: string;
  clientId?: string;
  courtId?: string;
  judgeId?: string;
  time?: string;
  type?: 'Adjourned' | 'Final' | 'Argued' | 'Preliminary';
  agenda?: string;
  createdDate?: string;
  lastUpdated?: string;
  externalEventId?: string;
  syncStatus?: 'synced' | 'not_synced' | 'sync_failed' | 'sync_pending';
  syncError?: string;
  lastSyncAt?: string;
  syncAttempts?: number;
}

// New Folder interface for DMS
interface Folder {
  id: string;
  name: string;
  parentId?: string;
  caseId?: string;
  documentCount: number;
  size: number;
  createdAt: string;
  lastAccess: string;
  description?: string;
  path: string;
}

// User Profile Interface
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  avatar: string;
  bio: string;
  location: string;
  timezone: string;
  joinedDate: string;
  lastLogin: string;
  isActive: boolean;
}

// Application State
export interface AppState {
  cases: Case[];
  tasks: Task[];
  taskNotes: TaskNote[];
  taskFollowUps: TaskFollowUp[]; // Phase 1: Follow-up records
  clients: Client[];
  clientGroups: ClientGroup[];
  courts: Court[];
  judges: Judge[];
  documents: Document[];
  folders: Folder[];
  hearings: Hearing[];
  employees: Employee[];
  timelineEntries: any[]; // Timeline entries for case history
  tags: string[]; // Global tags for consistent usage
  userProfile: UserProfile;
  isLoading: boolean;
  error: string | null;
}

// Actions  
export type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'ADD_CASE'; payload: Case }
  | { type: 'UPDATE_CASE'; payload: Partial<Case> & { id: string } }
  | { type: 'DELETE_CASE'; payload: string }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: Task }
  | { type: 'DELETE_TASK'; payload: string }
  | { type: 'ADD_TASK_NOTE'; payload: TaskNote }
  | { type: 'DELETE_TASK_NOTE'; payload: string }
  | { type: 'ADD_TASK_FOLLOWUP'; payload: TaskFollowUp }
  | { type: 'UPDATE_TASK_FOLLOWUP'; payload: TaskFollowUp }
  | { type: 'DELETE_TASK_FOLLOWUP'; payload: string }
  | { type: 'ADD_CLIENT'; payload: Client }
  | { type: 'UPDATE_CLIENT'; payload: Client }
  | { type: 'DELETE_CLIENT'; payload: string }
  | { type: 'ADD_CLIENT_GROUP'; payload: ClientGroup }
  | { type: 'UPDATE_CLIENT_GROUP'; payload: ClientGroup }
  | { type: 'DELETE_CLIENT_GROUP'; payload: string }
  | { type: 'SYNC_CLIENT_GROUP_COUNTS' }
  | { type: 'ADD_SIGNATORY'; payload: { clientId: string; signatory: Signatory } }
  | { type: 'UPDATE_SIGNATORY'; payload: { clientId: string; signatory: Signatory } }
  | { type: 'DELETE_SIGNATORY'; payload: { clientId: string; signatoryId: string } }
  | { type: 'UPDATE_PORTAL_ACCESS'; payload: { clientId: string; portalAccess: PortalAccess } }
  | { type: 'ADD_COURT'; payload: Court }
  | { type: 'UPDATE_COURT'; payload: Court }
  | { type: 'DELETE_COURT'; payload: string }
  | { type: 'ADD_JUDGE'; payload: Judge }
  | { type: 'UPDATE_JUDGE'; payload: Judge }
  | { type: 'DELETE_JUDGE'; payload: string }
  | { type: 'ADD_DOCUMENT'; payload: Document }
  | { type: 'UPDATE_DOCUMENT'; payload: Partial<Document> & { id: string } }
  | { type: 'DELETE_DOCUMENT'; payload: string }
  | { type: 'SET_FOLDERS'; payload: Folder[] }
  | { type: 'ADD_FOLDER'; payload: Folder }
  | { type: 'UPDATE_FOLDER'; payload: Partial<Folder> & { id: string } }
  | { type: 'DELETE_FOLDER'; payload: string }
  | { type: 'ADD_HEARING'; payload: Hearing }
  | { type: 'UPDATE_HEARING'; payload: Partial<Hearing> & { id: string } }
  | { type: 'DELETE_HEARING'; payload: string }
  | { type: 'ADD_EMPLOYEE'; payload: Employee }
  | { type: 'UPDATE_EMPLOYEE'; payload: { id: string; updates: Partial<Employee> } }
  | { type: 'DELETE_EMPLOYEE'; payload: string }
  | { type: 'SET_TAGS'; payload: string[] }
  | { type: 'ADD_TAG'; payload: string }
  | { type: 'REMOVE_TAG'; payload: string }
  | { type: 'UPDATE_USER_PROFILE'; payload: Partial<UserProfile> }
  | { type: 'ADD_TIMELINE_ENTRY'; payload: any }
  | { type: 'UPDATE_TIMELINE_ENTRY'; payload: any }
  | { type: 'DELETE_TIMELINE_ENTRY'; payload: string }
  | { type: 'RESTORE_STATE'; payload: Partial<AppState> }
  | { type: 'CLEAR_ALL_DATA' };

// Initial state - empty, loads from Supabase (single source of truth)
const initialState: AppState = {
  taskNotes: [],
  taskFollowUps: [],
  cases: [],
  tasks: [],
  clients: [],
  clientGroups: [],
  courts: [],
  judges: [],
  documents: [],
  folders: [],
  hearings: [],
  userProfile: {
    id: '',
    name: '',
    email: '',
    phone: '',
    role: 'Admin',
    department: '',
    avatar: '/placeholder.svg',
    bio: '',
    location: '',
    timezone: 'Asia/Kolkata',
    joinedDate: '',
    lastLogin: '',
    isActive: true
  },
  employees: [],
  tags: [],
  timelineEntries: [],
  isLoading: false,
  error: null
};

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'ADD_CASE':
      if (state.cases.some(c => c.id === action.payload.id)) {
        console.warn(`[AppStateContext] Skipping duplicate case: ${action.payload.id}`);
        return state;
      }
      return { ...state, cases: [...state.cases, action.payload] };
    case 'UPDATE_CASE':
      return {
        ...state,
        cases: state.cases.map(c => c.id === action.payload.id ? { ...c, ...action.payload } : c)
      };
    case 'DELETE_CASE':
      return {
        ...state,
        cases: state.cases.filter(c => c.id !== action.payload)
      };
    case 'ADD_TASK':
      if (state.tasks.some(t => t.id === action.payload.id)) {
        console.warn(`[AppStateContext] Skipping duplicate task: ${action.payload.id}`);
        return state;
      }
      return { ...state, tasks: [...state.tasks, action.payload] };
    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: state.tasks.map(t => t.id === action.payload.id ? { ...t, ...action.payload } : t)
      };
    case 'DELETE_TASK':
      return {
        ...state,
        tasks: state.tasks.filter(t => t.id !== action.payload)
      };
    case 'ADD_TASK_NOTE':
      return { ...state, taskNotes: [...state.taskNotes, action.payload] };
    case 'DELETE_TASK_NOTE':
      return {
        ...state,
        taskNotes: state.taskNotes.filter(n => n.id !== action.payload)
      };
    case 'ADD_TASK_FOLLOWUP':
      return { ...state, taskFollowUps: [...state.taskFollowUps, action.payload] };
    case 'UPDATE_TASK_FOLLOWUP':
      return {
        ...state,
        taskFollowUps: state.taskFollowUps.map(f => f.id === action.payload.id ? action.payload : f)
      };
    case 'DELETE_TASK_FOLLOWUP':
      return {
        ...state,
        taskFollowUps: state.taskFollowUps.filter(f => f.id !== action.payload)
      };
    case 'ADD_CLIENT':
      if (state.clients.some(c => c.id === action.payload.id)) {
        console.warn(`[AppStateContext] Skipping duplicate client: ${action.payload.id}`);
        return state;
      }
      return { ...state, clients: [...state.clients, action.payload] };
    case 'UPDATE_CLIENT':
      return {
        ...state,
        clients: state.clients.map(client => 
          client.id === action.payload.id ? { ...client, ...action.payload } : client
        )
      };

    case 'DELETE_CLIENT':
      return {
        ...state,
        clients: state.clients.filter(client => client.id !== action.payload)
      };

    case 'ADD_CLIENT_GROUP':
      return {
        ...state,
        clientGroups: [...state.clientGroups, action.payload]
      };

    case 'UPDATE_CLIENT_GROUP':
      return {
        ...state,
        clientGroups: state.clientGroups.map(g =>
          g.id === action.payload.id ? { ...g, ...action.payload } : g
        )
      };

    case 'DELETE_CLIENT_GROUP':
      return {
        ...state,
        clientGroups: state.clientGroups.filter(g => g.id !== action.payload)
      };

    case 'SYNC_CLIENT_GROUP_COUNTS':
      // Recalculate totalClients for all groups
      const groupCounts: Record<string, number> = {};
      state.clients.forEach(client => {
        if (client.clientGroupId) {
          groupCounts[client.clientGroupId] = (groupCounts[client.clientGroupId] || 0) + 1;
        }
      });
      
      return {
        ...state,
        clientGroups: state.clientGroups.map(group => ({
          ...group,
          totalClients: groupCounts[group.id] || 0
        }))
      };

    case 'ADD_SIGNATORY':
      return {
        ...state,
        clients: state.clients.map(client => 
          client.id === action.payload.clientId
            ? {
                ...client,
                signatories: [...(client.signatories || []), action.payload.signatory]
              }
            : client
        )
      };

    case 'UPDATE_SIGNATORY':
      return {
        ...state,
        clients: state.clients.map(client => 
          client.id === action.payload.clientId
            ? {
                ...client,
                signatories: (client.signatories || []).map(sig =>
                  sig.id === action.payload.signatory.id ? action.payload.signatory : sig
                )
              }
            : client
        )
      };

    case 'DELETE_SIGNATORY':
      return {
        ...state,
        clients: state.clients.map(client => 
          client.id === action.payload.clientId
            ? {
                ...client,
                signatories: (client.signatories || []).filter(sig => sig.id !== action.payload.signatoryId)
              }
            : client
        )
      };

    case 'UPDATE_PORTAL_ACCESS':
      return {
        ...state,
        clients: state.clients.map(client => 
          client.id === action.payload.clientId
            ? {
                ...client,
                portalAccess: action.payload.portalAccess
              }
            : client
        )
      };
    case 'ADD_COURT':
      if (state.courts.some(c => c.id === action.payload.id)) {
        console.warn(`[AppStateContext] Skipping duplicate court: ${action.payload.id}`);
        return state;
      }
      return { ...state, courts: [...state.courts, action.payload] };
    case 'UPDATE_COURT':
      return {
        ...state,
        courts: state.courts.map(c => c.id === action.payload.id ? { ...c, ...action.payload } : c)
      };
    case 'DELETE_COURT':
      return {
        ...state,
        courts: state.courts.filter(c => c.id !== action.payload)
      };
    case 'ADD_JUDGE':
      if (state.judges.some(j => j.id === action.payload.id)) {
        console.warn(`[AppStateContext] Skipping duplicate judge: ${action.payload.id}`);
        return state;
      }
      return { ...state, judges: [...state.judges, action.payload] };
    case 'UPDATE_JUDGE':
      return {
        ...state,
        judges: state.judges.map(j => j.id === action.payload.id ? { ...j, ...action.payload } : j)
      };
    case 'DELETE_JUDGE':
      return {
        ...state,
        judges: state.judges.filter(j => j.id !== action.payload)
      };
    case 'ADD_DOCUMENT':
      if (state.documents.some(d => d.id === action.payload.id)) {
        console.warn(`[AppStateContext] Skipping duplicate document: ${action.payload.id}`);
        return state;
      }
      return { ...state, documents: [...state.documents, action.payload] };
    case 'UPDATE_DOCUMENT':
      return {
        ...state,
        documents: state.documents.map(d => d.id === action.payload.id ? { ...d, ...action.payload } : d)
      };
    case 'DELETE_DOCUMENT':
      return {
        ...state,
        documents: state.documents.filter(d => d.id !== action.payload)
      };
    case 'SET_FOLDERS':
      return { ...state, folders: action.payload };
    case 'ADD_FOLDER':
      return { ...state, folders: [...state.folders, action.payload] };
    case 'UPDATE_FOLDER':
      return {
        ...state,
        folders: state.folders.map(f => f.id === action.payload.id ? { ...f, ...action.payload } : f)
      };
    case 'DELETE_FOLDER':
      return {
        ...state,
        folders: state.folders.filter(f => f.id !== action.payload)
      };
    case 'ADD_HEARING':
      if (state.hearings.some(h => h.id === action.payload.id)) {
        console.warn(`[AppStateContext] Skipping duplicate hearing: ${action.payload.id}`);
        return state;
      }
      return { ...state, hearings: [...state.hearings, action.payload] };
    case 'UPDATE_HEARING':
      return {
        ...state,
        hearings: state.hearings.map(h => h.id === action.payload.id ? { ...h, ...action.payload } : h)
      };
    case 'DELETE_HEARING':
      return {
        ...state,
        hearings: state.hearings.filter(h => h.id !== action.payload)
      };
    case 'ADD_EMPLOYEE':
      if (state.employees.some(e => e.id === action.payload.id)) {
        console.warn(`[AppStateContext] Skipping duplicate employee: ${action.payload.id}`);
        return state;
      }
      return { ...state, employees: [...state.employees, action.payload] };
    case 'UPDATE_EMPLOYEE':
      return {
        ...state,
        employees: state.employees.map(e => e.id === action.payload.id ? { ...e, ...action.payload.updates } : e)
      };
    case 'DELETE_EMPLOYEE':
      return {
        ...state,
        employees: state.employees.filter(e => e.id !== action.payload)
      };
    case 'SET_TAGS':
      return { ...state, tags: action.payload };
    case 'ADD_TAG':
      return {
        ...state,
        tags: [...state.tags, action.payload].filter((tag, index, self) => self.indexOf(tag) === index)
      };
    case 'REMOVE_TAG':
      return {
        ...state,
        tags: state.tags.filter(tag => tag !== action.payload)
      };
    case 'UPDATE_USER_PROFILE':
      return {
        ...state,
        userProfile: { ...state.userProfile, ...action.payload }
      };
    case 'ADD_TIMELINE_ENTRY':
      if (state.timelineEntries.some(e => e.id === action.payload.id)) {
        console.warn(`[AppStateContext] Skipping duplicate timeline entry: ${action.payload.id}`);
        return state;
      }
      return {
        ...state,
        timelineEntries: [...state.timelineEntries, action.payload]
      };
    case 'UPDATE_TIMELINE_ENTRY':
      return {
        ...state,
        timelineEntries: state.timelineEntries.map(entry =>
          entry.id === action.payload.id ? { ...entry, ...action.payload } : entry
        )
      };
    case 'DELETE_TIMELINE_ENTRY':
      return {
        ...state,
        timelineEntries: state.timelineEntries.filter(e => e.id !== action.payload)
      };
    case 'RESTORE_STATE':
      return { 
        ...state, 
        ...action.payload,
        clientGroups: action.payload.clientGroups || state.clientGroups,
        timelineEntries: action.payload.timelineEntries || []
      };
    case 'CLEAR_ALL_DATA':
      return {
        ...initialState,
        cases: [],
        tasks: [],
        clients: [],
        clientGroups: [],
        courts: [],
        judges: [],
        documents: [],
        folders: [],
        hearings: [],
        employees: [],
        timelineEntries: [],
        tags: [],
      };
    default:
      return state;
  }
}

// Context
const AppStateContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;      // Persistent dispatch (for user actions)
  rawDispatch: React.Dispatch<AppAction>;   // Non-persistent dispatch (for real-time events)
} | null>(null);

// Provider
export const AppStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, originalDispatch] = useReducer(appReducer, initialState);
  
  // Wrap dispatch with persistence middleware for user actions
  const dispatch = useSyncPersistentDispatch(originalDispatch);
  
  // Expose raw dispatch for real-time subscriptions (data already in DB)
  const rawDispatch = originalDispatch;

  // Initialize calendar auto-sync
  useEffect(() => {
    const initializeCalendarSync = async () => {
      try {
        const { integrationsService } = await import('@/services/integrationsService');
        const settings = await integrationsService.loadCalendarSettings();
        
        if (settings?.autoSync && settings.provider !== 'none') {
          // Start with configured interval or default to 5 minutes
          const interval = settings.syncInterval || 5;
          calendarSyncService.startAutoSync(interval);
          console.log(`Calendar auto-sync started with ${interval} minute interval`);
        }
      } catch (error) {
        console.error('Failed to initialize calendar auto-sync:', error);
      }
    };

    initializeCalendarSync();

    // Cleanup on unmount
    return () => {
      calendarSyncService.stopAutoSync();
    };
  }, []);

  return (
    <AppStateContext.Provider value={{ state, dispatch, rawDispatch }}>
      {children}
    </AppStateContext.Provider>
  );
};

// Hook
export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider');
  }
  return context; // Now returns { state, dispatch, rawDispatch }
};

// Safe hook that returns null instead of throwing (for hot reload resilience)
export const useAppStateSafe = () => {
  return useContext(AppStateContext);
};

// Helper functions for court case calculations
export const getActiveCourtCases = (courtId: string, cases: Case[]): number => {
  return cases.filter(c => 
    c.status === 'Active' && 
    c.nextHearing?.courtId === courtId
  ).length;
};

export const getTotalActiveCases = (cases: Case[]): number => {
  return cases.filter(c => 
    c.status === 'Active' && 
    c.nextHearing?.courtId
  ).length;
};

export const getJurisdictionInsights = (
  courts: Court[], 
  cases: Case[], 
  jurisdiction: string
) => {
  // Filter courts by jurisdiction (contains match for flexibility)
  const jurisdictionCourts = courts.filter(c => 
    c.jurisdiction?.toLowerCase().includes(jurisdiction.toLowerCase()) &&
    (c.status || 'Active') === 'Active'
  );

  // Calculate cases for each authority level
  const insights = {
    totalCourts: jurisdictionCourts.length,
    totalActiveCases: 0,
    byLevel: {} as Record<string, { count: number; cases: number }>
  };

  jurisdictionCourts.forEach(court => {
    const caseCount = getActiveCourtCases(court.id, cases);
    insights.totalActiveCases += caseCount;
    
    const level = court.authorityLevel || 'ADJUDICATION';
    if (!insights.byLevel[level]) {
      insights.byLevel[level] = { count: 0, cases: 0 };
    }
    insights.byLevel[level].count += 1;
    insights.byLevel[level].cases += caseCount;
  });

  return insights;
};

// Export types
export type { Case, Task, Client, Court, Judge, Document, Folder, Hearing, GeneratedForm };

// New interfaces for enhanced Client Master
export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface Jurisdiction {
  // JURISDICTION TYPE SELECTOR
  jurisdictionType?: 'state' | 'center' | 'both';
  
  // STATE JURISDICTION (Administrative Office)
  stateJurisdiction?: {
    state?: string;          // e.g., "Gujarat"
    division?: string;       // e.g., "Division - 1"
    range?: string;          // e.g., "Range - 3"
    unit?: string;           // e.g., "Ghatak 9 (Ahmedabad)"
  };
  
  // CENTER JURISDICTION (Other Office - CBIC)
  centerJurisdiction?: {
    zone?: string;           // e.g., "AHMEDABAD"
    commissionerate?: string; // e.g., "AHMEDABAD SOUTH"
    division?: string;       // e.g., "DIVISION-VII - SATELLITE"
    range?: string;          // e.g., "RANGE I"
  };
  
  // BACKWARD COMPATIBILITY (keep existing fields)
  commissionerate?: string;  // Legacy field
  division?: string;         // Legacy field
  range?: string;            // Legacy field
}

export interface PortalAccess {
  allowLogin: boolean;
  email?: string;
  mobile?: string;
  username?: string;
  passwordHash?: string;
  role?: 'viewer' | 'editor' | 'admin';
}

export interface SignatoryEmail {
  id: string;
  email: string;
  label: 'Work' | 'Personal' | 'Legal' | 'Other';
  isPrimary: boolean;
  isVerified: boolean;
  status: 'Active' | 'Inactive';
}

export interface SignatoryPhone {
  id: string;
  countryCode: string;
  number: string;
  label: 'Mobile' | 'WhatsApp' | 'Office' | 'Home' | 'Legal' | 'Other';
  isPrimary: boolean;
  isWhatsApp: boolean;
  isVerified: boolean;
  status: 'Active' | 'Inactive';
}

export interface Signatory {
  id: string;
  fullName: string;
  designation?: string;
  
  // NEW: Multiple emails and phones
  emails: SignatoryEmail[];
  phones: SignatoryPhone[];
  
  // DEPRECATED: Keep for backward compatibility
  email?: string;
  phone?: string;
  mobile?: string;
  
  dob?: string;
  isPrimary: boolean;
  scope: 'All' | 'GST Filings' | 'Litigation' | 'Appeals';
  status: 'Active' | 'Inactive';
}

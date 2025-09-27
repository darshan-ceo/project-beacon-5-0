/**
 * Centralized Application Configuration
 * GST Litigation Platform - Project Beacon
 */

export const GST_STAGES = [
  'Intake & KYC',
  'ASMT-10 Notice Received',
  'ASMT-10 Reply Drafting', 
  'ASMT-10 Reply Filed',
  'DRC-01 SCN Received',
  'DRC-06 Reply Drafting',
  'Hearing Scheduled',
  'Hearing / Adjourned',
  'Evidence / Additional Submission',
  'Final Order – DRC-07 Received',
  'Rectification/Withdrawal – DRC-08 (optional)',
  'Appeal Filed – APL-01',
  'Appeal Hearing',
  'Appeal Order (APL-05)',
  'Closed',
  'Any Stage'
] as const;

export const EMPLOYEE_ROLES = [
  'Associate',
  'Senior Associate',
  'Team Lead', 
  'Partner',
  'Senior Partner',
  'Managing Partner',
  'Client Relations'
] as const;

export const GST_NOTICE_TYPES = [
  'ASMT-10',
  'DRC-01'
] as const;

export const CLIENT_TIERS = [
  'Tier 1',
  'Tier 2', 
  'Tier 3'
] as const;

export const TASK_CATEGORIES = [
  'General',
  'Legal Drafting',
  'Documentation',
  'Review',
  'Filing',
  'Research',
  'Client Communication'
] as const;

export const PRIORITY_OPTIONS = [
  { value: 'Critical', label: 'Critical', color: 'destructive' },
  { value: 'High', label: 'High', color: 'orange' },
  { value: 'Medium', label: 'Medium', color: 'blue' },
  { value: 'Low', label: 'Low', color: 'green' }
] as const;

export type GSTStage = typeof GST_STAGES[number];
export type EmployeeRole = typeof EMPLOYEE_ROLES[number];
export type GSTNoticeType = typeof GST_NOTICE_TYPES[number];
export type ClientTier = typeof CLIENT_TIERS[number];
export type TaskCategory = typeof TASK_CATEGORIES[number];
export type PriorityLevel = typeof PRIORITY_OPTIONS[number]['value'];

export const APP_CONFIG = {
  GST_STAGES,
  EMPLOYEE_ROLES,
  GST_NOTICE_TYPES,
  CLIENT_TIERS,
  TASK_CATEGORIES,
  PRIORITY_OPTIONS,
  
  // Default automation settings
  DEFAULT_STAGE_SCOPE: ['Any Stage'] as GSTStage[],
  DEFAULT_AUTO_CREATE: false,
  DEFAULT_SUGGEST_ON_CHANGE: false
} as const;
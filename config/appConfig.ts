/**
 * Centralized Application Configuration
 * GST Litigation Platform - Project Beacon
 */

// Case Type Taxonomy
export const CASE_TYPES = [
  'GST',
  'ST',     // Service Tax
  'Excise',
  'Custom',
  'VAT',
  'DGFT'
] as const;

// Matter Types for Scrutiny Stage
export const MATTER_TYPES = [
  'Scrutiny',
  'General Inquiry',
  'Audit',
  'Investigation',
  'Refund',
  'Advance Ruling',
  'Amnesty',
  'E-waybill'
] as const;

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

// REMOVED: EMPLOYEE_ROLES - Now dynamically sourced from Employee Master
// Use getAvailableEmployeeRoles() from masterDataUtils.ts

export const GST_NOTICE_TYPES = [
  'ASMT-10',
  'DRC-01'
] as const;

// Client Types from GST Portal (16 Types)
export const CLIENT_TYPES = [
  'Proprietorship',
  'Partnership',
  'Limited Liability Partnership',
  'Foreign Limited Liability Partnership',
  'Private Limited Company',
  'Public Limited Company',
  'Unlimited Company',
  'Foreign Company',
  'Hindu Undivided Family',
  'Government Department',
  'Public Sector Undertaking',
  'Society/ Club/ Trust/ AOP',
  'Statutory Body',
  'Local Authority',
  'Individual',
  'Others'
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

export type CaseType = typeof CASE_TYPES[number];
export type MatterType = typeof MATTER_TYPES[number];
export type GSTStage = typeof GST_STAGES[number];
export type GSTNoticeType = typeof GST_NOTICE_TYPES[number];
export type ClientType = typeof CLIENT_TYPES[number];
export type ClientTier = typeof CLIENT_TIERS[number];
export type TaskCategory = typeof TASK_CATEGORIES[number];
export type PriorityLevel = typeof PRIORITY_OPTIONS[number]['value'];

// Date formatting configuration
export const DATE_CONFIG = {
  displayFormat: 'DD-MM-YYYY',
  inputFormat: 'YYYY-MM-DD', // HTML5 date input requirement
  longFormat: 'DD MMM YYYY',
  shortFormat: 'DD/MM/YYYY',
  locale: 'en-GB' // British locale uses DD/MM/YYYY
} as const;

export const APP_CONFIG = {
  CASE_TYPES,
  MATTER_TYPES,
  GST_STAGES,
  GST_NOTICE_TYPES,
  CLIENT_TYPES,
  CLIENT_TIERS,
  TASK_CATEGORIES,
  PRIORITY_OPTIONS,
  DATE_CONFIG,
  
  // Default automation settings
  DEFAULT_STAGE_SCOPE: ['Any Stage'] as GSTStage[],
  DEFAULT_AUTO_CREATE: false,
  DEFAULT_SUGGEST_ON_CHANGE: false
} as const;
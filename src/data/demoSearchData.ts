/**
 * Demo Search Data for Global Search
 * Used when API is not available and dev mode is active
 */

import { SearchResult } from '@/services/searchService';

export const demoSearchIndex: SearchResult[] = [
  // Cases
  {
    type: 'case',
    id: 'CASE-2024-001',
    title: 'ABC Corp vs Tax Authority',
    subtitle: 'ABC Corporation • CASE-2024-001 • Assessment Stage',
    url: '/cases/CASE-2024-001',
    score: 0.95,
    highlights: ['GST assessment for FY 2023-24', 'Input tax credit dispute'],
    badges: ['Active', 'High Priority', 'Assessment']
  },
  {
    type: 'case',
    id: 'CASE-2024-002',
    title: 'XYZ Enterprises Appeal',
    subtitle: 'XYZ Enterprises • CASE-2024-002 • Appeal Filed',
    url: '/cases/CASE-2024-002',
    score: 0.88,
    highlights: ['First appeal against penalty order', 'Section 74 proceedings'],
    badges: ['Active', 'Appeal', 'Penalty Dispute']
  },
  {
    type: 'case',
    id: 'CASE-2023-045',
    title: 'DEF Industries Classification Issue',
    subtitle: 'DEF Industries • CASE-2023-045 • Classification Dispute',
    url: '/cases/CASE-2023-045',
    score: 0.82,
    highlights: ['HSN code classification', 'Rate of tax dispute'],
    badges: ['Active', 'Classification', 'Rate Dispute']
  },

  // Clients
  {
    type: 'client',
    id: 'CLIENT-001',
    title: 'ABC Corporation',
    subtitle: 'Manufacturing • GSTIN: 07AABCA1234C1Z5',
    url: '/clients/CLIENT-001',
    score: 0.92,
    highlights: ['Large manufacturing company', 'Multiple state registrations'],
    badges: ['Active', 'Corporate', 'Multi-State']
  },
  {
    type: 'client',
    id: 'CLIENT-002',
    title: 'XYZ Enterprises',
    subtitle: 'Trading • GSTIN: 27XYZAB5678P1Q2',
    url: '/clients/CLIENT-002',
    score: 0.85,
    highlights: ['Trading business', 'Import-export activities'],
    badges: ['Active', 'Trading', 'Import-Export']
  },
  {
    type: 'client',
    id: 'CLIENT-003',
    title: 'DEF Industries',
    subtitle: 'Services • GSTIN: 19DEFGH9012R3S4',
    url: '/clients/CLIENT-003',
    score: 0.78,
    highlights: ['Service provider', 'IT and consulting'],
    badges: ['Active', 'Services', 'IT Sector']
  },

  // Tasks
  {
    type: 'task',
    id: 'TASK-001',
    title: 'Prepare Assessment Reply',
    subtitle: 'ABC Corp vs Tax Authority • Due: Tomorrow',
    url: '/tasks/TASK-001',
    score: 0.90,
    highlights: ['Draft reply to assessment order', 'Compile supporting documents'],
    badges: ['High Priority', 'Due Tomorrow', 'Assessment']
  },
  {
    type: 'task',
    id: 'TASK-002',
    title: 'File Appeal Petition',
    subtitle: 'XYZ Enterprises Appeal • Due: This Week',
    url: '/tasks/TASK-002',
    score: 0.87,
    highlights: ['First appeal petition', 'Appellate authority filing'],
    badges: ['Medium Priority', 'This Week', 'Appeal']
  },
  {
    type: 'task',
    id: 'TASK-003',
    title: 'Client Meeting - Strategy Discussion',
    subtitle: 'DEF Industries • Scheduled: Today 3 PM',
    url: '/tasks/TASK-003',
    score: 0.85,
    highlights: ['Discuss case strategy', 'Review classification issues'],
    badges: ['Today', 'Meeting', 'Strategy']
  },

  // Documents
  {
    type: 'document',
    id: 'DOC-001',
    title: 'Assessment Order Copy',
    subtitle: 'ABC Corporation • Assessment • PDF',
    url: '/documents/DOC-001',
    score: 0.88,
    highlights: ['Original assessment order from department', 'Shows input tax credit disallowance'],
    badges: ['Assessment', 'Original', 'PDF']
  },
  {
    type: 'document',
    id: 'DOC-002',
    title: 'GST Registration Certificate',
    subtitle: 'XYZ Enterprises • Registration • PDF',
    url: '/documents/DOC-002',
    score: 0.83,
    highlights: ['GST registration certificate', 'Valid from April 2019'],
    badges: ['Registration', 'Certificate', 'PDF']
  },
  {
    type: 'document',
    id: 'DOC-003',
    title: 'Penalty Order Analysis',
    subtitle: 'DEF Industries • Analysis • DOCX',
    url: '/documents/DOC-003',
    score: 0.80,
    highlights: ['Internal analysis of penalty order', 'Grounds for appeal identified'],
    badges: ['Analysis', 'Internal', 'DOCX']
  },

  // Hearings
  {
    type: 'hearing',
    id: 'HEARING-001',
    title: 'Assessment Hearing',
    subtitle: 'ABC Corp vs Tax Authority • Tomorrow 11 AM',
    url: '/hearings/HEARING-001',
    score: 0.91,
    highlights: ['Personal hearing for assessment case', 'Adjudicating Authority'],
    badges: ['Tomorrow', 'Assessment', 'Personal Hearing']
  },
  {
    type: 'hearing',
    id: 'HEARING-002',
    title: 'Appeal Hearing',
    subtitle: 'XYZ Enterprises Appeal • Next Week',
    url: '/hearings/HEARING-002',
    score: 0.86,
    highlights: ['First appeal hearing', 'Appellate Authority'],
    badges: ['Next Week', 'Appeal', 'First Appeal']
  },
  {
    type: 'hearing',
    id: 'HEARING-003',
    title: 'Classification Hearing',
    subtitle: 'DEF Industries • Date TBD',
    url: '/hearings/HEARING-003',
    score: 0.81,
    highlights: ['Classification dispute hearing', 'HSN code determination'],
    badges: ['Pending', 'Classification', 'HSN Code']
  },

  // Additional demo data for comprehensive search
  {
    type: 'client',
    id: 'CLIENT-004',
    title: 'PQR Solutions',
    subtitle: 'Consulting • GSTIN: 29PQRST1234U5V6',
    url: '/clients/CLIENT-004',
    score: 0.75,
    highlights: ['Management consulting', 'Professional services'],
    badges: ['Active', 'Consulting', 'Professional']
  },
  {
    type: 'case',
    id: 'CASE-2024-003',
    title: 'MNO Traders Refund Claim',
    subtitle: 'MNO Traders • CASE-2024-003 • Refund Processing',
    url: '/cases/CASE-2024-003',
    score: 0.79,
    highlights: ['Export refund claim', 'Delayed processing'],
    badges: ['Active', 'Refund', 'Export']
  },
  {
    type: 'document',
    id: 'DOC-004',
    title: 'Refund Application Form',
    subtitle: 'MNO Traders • Refund • PDF',
    url: '/documents/DOC-004',
    score: 0.77,
    highlights: ['Export refund application', 'RFD-01 form with supporting documents'],
    badges: ['Refund', 'Export', 'RFD-01']
  },
  {
    type: 'task',
    id: 'TASK-004',
    title: 'Follow up on Refund Status',
    subtitle: 'MNO Traders Refund Claim • Due: Friday',
    url: '/tasks/TASK-004',
    score: 0.84,
    highlights: ['Check refund processing status', 'Contact department if needed'],
    badges: ['Medium Priority', 'Friday', 'Follow-up']
  }
];
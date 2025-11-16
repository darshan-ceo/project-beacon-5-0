/**
 * Authority Level & Matter Type Hierarchy System
 * Defines configurable hierarchy where authority levels can have sub-levels (matter types)
 */

export interface MatterTypeConfig {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface AuthorityLevelConfig {
  id: string; // Matches AuthorityLevel enum values
  name: string;
  description: string;
  hint: string;
  color: string;
  isActive: boolean;
  sortOrder: number;
  allowsMatterTypes: boolean; // If true, can have sub-levels
  matterTypes: MatterTypeConfig[]; // Sub-levels for this authority level
}

export interface AuthorityHierarchyMaster {
  authorityLevels: AuthorityLevelConfig[];
  version: string; // For migration tracking
  lastUpdated: string;
}

// Default hierarchy configuration
export const DEFAULT_AUTHORITY_HIERARCHY: AuthorityHierarchyMaster = {
  version: '1.0',
  lastUpdated: new Date().toISOString(),
  authorityLevels: [
    {
      id: 'ASSESSMENT',
      name: 'Assessment',
      description: 'Assessment stage before adjudication',
      hint: 'Initial assessment and scrutiny level',
      color: 'bg-blue-500 text-white',
      isActive: true,
      sortOrder: 1,
      allowsMatterTypes: true,
      matterTypes: [
        { id: 'scrutiny', name: 'Scrutiny', description: 'Assessment under scrutiny', isActive: true, sortOrder: 1 },
        { id: 'audit', name: 'Audit', description: 'Assessment under audit', isActive: true, sortOrder: 2 },
        { id: 'investigation', name: 'Investigation', description: 'Assessment under investigation', isActive: true, sortOrder: 3 },
        { id: 'refund', name: 'Refund', description: 'Refund assessment', isActive: true, sortOrder: 4 },
        { id: 'inspection', name: 'Inspection', description: 'Physical inspection', isActive: true, sortOrder: 5 }
      ]
    },
    {
      id: 'ADJUDICATION',
      name: 'Adjudication Authority',
      description: 'First level of formal adjudication',
      hint: 'Order-in-Original stage',
      color: 'bg-purple-500 text-white',
      isActive: true,
      sortOrder: 2,
      allowsMatterTypes: false,
      matterTypes: []
    },
    {
      id: 'FIRST_APPEAL',
      name: 'First Appeal',
      description: 'First appellate authority',
      hint: 'Appeal to Commissioner (Appeals)',
      color: 'bg-orange-500 text-white',
      isActive: true,
      sortOrder: 3,
      allowsMatterTypes: false,
      matterTypes: []
    },
    {
      id: 'REVISIONAL',
      name: 'Revisional Authority',
      description: 'Revisional proceedings',
      hint: 'Commissioner suo-moto review',
      color: 'bg-yellow-500 text-white',
      isActive: true,
      sortOrder: 4,
      allowsMatterTypes: false,
      matterTypes: []
    },
    {
      id: 'TRIBUNAL',
      name: 'GTAT / CESTAT / ITAT',
      description: 'Tribunal level appeals',
      hint: 'Appellate Tribunal',
      color: 'bg-green-500 text-white',
      isActive: true,
      sortOrder: 5,
      allowsMatterTypes: true,
      matterTypes: [
        { id: 'state_bench', name: 'State Bench', description: 'State level tribunal bench', isActive: true, sortOrder: 1 },
        { id: 'principal_bench', name: 'Principal Bench', description: 'Principal tribunal bench', isActive: true, sortOrder: 2 }
      ]
    },
    {
      id: 'PRINCIPAL_BENCH',
      name: 'Principal Bench',
      description: 'Principal bench of tribunal',
      hint: 'Main tribunal bench',
      color: 'bg-teal-500 text-white',
      isActive: true,
      sortOrder: 6,
      allowsMatterTypes: false,
      matterTypes: []
    },
    {
      id: 'HIGH_COURT',
      name: 'High Court',
      description: 'State High Court',
      hint: 'Constitutional court at state level',
      color: 'bg-red-500 text-white',
      isActive: true,
      sortOrder: 7,
      allowsMatterTypes: false,
      matterTypes: []
    },
    {
      id: 'SUPREME_COURT',
      name: 'Supreme Court',
      description: 'Supreme Court of India',
      hint: 'Apex court of the country',
      color: 'bg-indigo-500 text-white',
      isActive: true,
      sortOrder: 8,
      allowsMatterTypes: false,
      matterTypes: []
    }
  ]
};

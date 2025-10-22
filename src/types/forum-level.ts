/**
 * GST Forum Hierarchy Levels
 * Represents the 8-level GST-specific legal authority progression
 */
export type ForumLevel =
  | 'DIVISION'              // Division Office (Original Authority)
  | 'COMMISSIONERATE'       // Commissionerate (Adjudication Authority)
  | 'APPEALS'               // Commissioner (Appeals) / First Appellate Authority
  | 'GSTAT_STATE'           // GST Appellate Tribunal - State Bench
  | 'GSTAT_PRINCIPAL'       // GST Appellate Tribunal - Principal Bench
  | 'HIGH_COURT'            // State High Court
  | 'SUPREME_COURT';        // Apex Court of India

export interface ForumLevelMetadata {
  key: ForumLevel;
  label: string;
  description: string;
  hint: string;
  color: string;
}

export const FORUM_LEVEL_METADATA: Record<ForumLevel, ForumLevelMetadata> = {
  DIVISION: {
    key: 'DIVISION',
    label: 'Division',
    description: 'Division Office - Original Authority',
    hint: 'Divisional office handling GST matters',
    color: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-300'
  },
  COMMISSIONERATE: {
    key: 'COMMISSIONERATE',
    label: 'Commissionerate',
    description: 'Commissionerate - Adjudication Authority',
    hint: 'GST Commissionerate for adjudication',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
  },
  APPEALS: {
    key: 'APPEALS',
    label: 'Commissioner (Appeals)',
    description: 'First Appellate Authority',
    hint: 'Commissioner (Appeals) - First Appeal',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
  },
  GSTAT_STATE: {
    key: 'GSTAT_STATE',
    label: 'GSTAT - State Bench',
    description: 'GST Appellate Tribunal - State Bench',
    hint: 'State-level tribunal bench',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
  },
  GSTAT_PRINCIPAL: {
    key: 'GSTAT_PRINCIPAL',
    label: 'GSTAT - Principal Bench',
    description: 'GST Appellate Tribunal - Principal Bench',
    hint: 'Principal/Head bench of GSTAT',
    color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300'
  },
  HIGH_COURT: {
    key: 'HIGH_COURT',
    label: 'High Court',
    description: 'State High Court',
    hint: 'Constitutional court - State level',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
  },
  SUPREME_COURT: {
    key: 'SUPREME_COURT',
    label: 'Supreme Court',
    description: 'Apex Court of India',
    hint: 'Constitutional court - National level',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
  }
};

export const FORUM_LEVEL_OPTIONS = [
  { value: 'all', label: 'All Forum Levels' },
  { value: 'DIVISION', label: 'Division' },
  { value: 'COMMISSIONERATE', label: 'Commissionerate' },
  { value: 'APPEALS', label: 'Commissioner (Appeals)' },
  { value: 'GSTAT_STATE', label: 'GSTAT - State Bench' },
  { value: 'GSTAT_PRINCIPAL', label: 'GSTAT - Principal Bench' },
  { value: 'HIGH_COURT', label: 'High Court' },
  { value: 'SUPREME_COURT', label: 'Supreme Court' }
];

/**
 * Legal Authority Hierarchy Levels
 * Represents the progression of legal authorities from pre-adjudication to apex court
 */
export type AuthorityLevel =
  | 'ASSESSMENT'         // Pre-adjudication / Assessment stage (Proper Officer)
  | 'ADJUDICATION'       // Original authority (Proper Officer / Commissionerate)
  | 'FIRST_APPEAL'       // Commissioner (Appeals) / Appellate Authority (GST)
  | 'REVISIONAL'         // Revisional Authority (S.108 GST Act, etc.)
  | 'TRIBUNAL'           // GTAT / CESTAT / ITAT etc.
  | 'PRINCIPAL_BENCH'    // Head/Principal Bench of Tribunal
  | 'HIGH_COURT'         // State High Court
  | 'SUPREME_COURT';     // Apex Court of India

export interface AuthorityLevelMetadata {
  key: AuthorityLevel;
  label: string;
  description: string;
  hint: string;
  color: string;
}

export const AUTHORITY_LEVEL_METADATA: Record<AuthorityLevel, AuthorityLevelMetadata> = {
  ASSESSMENT: {
    key: 'ASSESSMENT',
    label: 'Assessment',
    description: 'Pre-adjudication stage',
    hint: 'Proper Officer / Assessment',
    color: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-300'
  },
  ADJUDICATION: {
    key: 'ADJUDICATION',
    label: 'Adjudication Authority',
    description: 'Original adjudicating authority',
    hint: 'Proper Officer / Commissionerate',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
  },
  FIRST_APPEAL: {
    key: 'FIRST_APPEAL',
    label: 'First Appeal',
    description: 'First appellate authority',
    hint: 'Commissioner (Appeals) / AA',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
  },
  REVISIONAL: {
    key: 'REVISIONAL',
    label: 'Revisional Authority',
    description: 'Revisional jurisdiction',
    hint: 'S.108 GST / Revisional Board',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
  },
  TRIBUNAL: {
    key: 'TRIBUNAL',
    label: 'GTAT / CESTAT / ITAT',
    description: 'Appellate tribunal',
    hint: 'Tribunal bench level',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
  },
  PRINCIPAL_BENCH: {
    key: 'PRINCIPAL_BENCH',
    label: 'Principal Bench',
    description: 'Head bench of tribunal',
    hint: 'Principal/Head Bench',
    color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300'
  },
  HIGH_COURT: {
    key: 'HIGH_COURT',
    label: 'High Court',
    description: 'State high court',
    hint: 'Constitutional court - State',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
  },
  SUPREME_COURT: {
    key: 'SUPREME_COURT',
    label: 'Supreme Court',
    description: 'Apex court of India',
    hint: 'Constitutional court - National',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
  }
};

export const AUTHORITY_LEVEL_OPTIONS = [
  { value: 'all', label: 'All Authority Levels' },
  { value: 'ASSESSMENT', label: 'Assessment' },
  { value: 'ADJUDICATION', label: 'Adjudication Authority' },
  { value: 'FIRST_APPEAL', label: 'First Appeal' },
  { value: 'REVISIONAL', label: 'Revisional Authority' },
  { value: 'TRIBUNAL', label: 'GTAT / CESTAT / ITAT' },
  { value: 'PRINCIPAL_BENCH', label: 'Principal Bench' },
  { value: 'HIGH_COURT', label: 'High Court' },
  { value: 'SUPREME_COURT', label: 'Supreme Court' }
];

/**
 * Stage Colors - Case Position in Litigation Flow
 * Stage defines WHERE the case is in the legal process
 * H-Office Litigation CRM Brand Guidelines v1.0
 */

export type StageCategory = 'draft' | 'hearing' | 'order' | 'appeal';

export interface StageColorConfig {
  label: string;
  color: string;
  background: string;
  hsl: {
    color: string;
    background: string;
  };
  className: string;
}

export const STAGE_COLORS: Record<StageCategory, StageColorConfig> = {
  draft: {
    label: "Draft / Preparation",
    color: "#64748B",
    background: "#F1F5F9",
    hsl: {
      color: "215 16% 47%",
      background: "213 27% 96%"
    },
    className: "bg-slate-100 text-slate-600 border-slate-200"
  },
  hearing: {
    label: "Hearing / Active Litigation",
    color: "#1E3A8A",
    background: "#EFF6FF",
    hsl: {
      color: "222 47% 33%",
      background: "214 100% 97%"
    },
    className: "bg-blue-50 text-blue-800 border-blue-200"
  },
  order: {
    label: "Order / Judgement",
    color: "#3730A3",
    background: "#EEF2FF",
    hsl: {
      color: "243 75% 43%",
      background: "226 100% 97%"
    },
    className: "bg-indigo-50 text-indigo-800 border-indigo-200"
  },
  appeal: {
    label: "Appeal / Escalation",
    color: "#0F766E",
    background: "#ECFEFF",
    hsl: {
      color: "171 75% 24%",
      background: "185 96% 97%"
    },
    className: "bg-cyan-50 text-teal-700 border-cyan-200"
  }
};

/**
 * Map GST_STAGES to stage categories
 * This determines which color set each stage uses
 */
export const GST_STAGE_TO_CATEGORY: Record<string, StageCategory> = {
  // Draft / Preparation stages
  'Intake & KYC': 'draft',
  'ASMT-10 Notice Received': 'draft',
  'ASMT-10 Reply Drafting': 'draft',
  'ASMT-10 Reply Filed': 'draft',
  
  // Hearing / Active Litigation stages
  'DRC-01 SCN Received': 'hearing',
  'DRC-06 Reply Drafting': 'hearing',
  'Hearing Scheduled': 'hearing',
  'Hearing / Adjourned': 'hearing',
  'Evidence / Additional Submission': 'hearing',
  
  // Order / Judgement stages
  'Final Order – DRC-07 Received': 'order',
  'Rectification/Withdrawal – DRC-08 (optional)': 'order',
  'Appeal Order (APL-05)': 'order',
  
  // Appeal / Escalation stages
  'Appeal Filed – APL-01': 'appeal',
  'Appeal Hearing': 'appeal',
  
  // Special cases
  'Closed': 'draft',
  'Any Stage': 'draft'
};

/**
 * Get stage color config from GST stage name
 */
export function getStageColor(stageName: string): StageColorConfig {
  const category = GST_STAGE_TO_CATEGORY[stageName] || 'draft';
  return STAGE_COLORS[category];
}

/**
 * Get stage category from GST stage name
 */
export function getStageCategory(stageName: string): StageCategory {
  return GST_STAGE_TO_CATEGORY[stageName] || 'draft';
}

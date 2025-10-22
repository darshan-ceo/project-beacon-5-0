import { ForumLevel } from '@/types/forum-level';

export interface LegalAuthorityMetrics {
  totalLegalForums: number;
  activeLegalForums: number;
  levels: Record<ForumLevel, number>;
}

export const MOCK_LEGAL_AUTH_COUNTS: LegalAuthorityMetrics = {
  totalLegalForums: 24,
  activeLegalForums: 22,
  levels: {
    DIVISION: 8,
    COMMISSIONERATE: 5,
    APPEALS: 4,
    GSTAT_STATE: 3,
    GSTAT_PRINCIPAL: 1,
    HIGH_COURT: 2,
    SUPREME_COURT: 1
  }
};

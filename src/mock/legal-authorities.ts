import { AuthorityLevel } from '@/types/authority-level';

export interface LegalAuthorityMetrics {
  totalLegalForums: number;
  activeLegalForums: number;
  levels: Record<AuthorityLevel, number>;
}

export const MOCK_LEGAL_AUTH_COUNTS: LegalAuthorityMetrics = {
  totalLegalForums: 18,
  activeLegalForums: 15,
  levels: {
    ADJUDICATION: 7,
    FIRST_APPEAL: 4,
    REVISIONAL: 1,
    TRIBUNAL: 3,
    PRINCIPAL_BENCH: 1,
    HIGH_COURT: 1,
    SUPREME_COURT: 1
  }
};

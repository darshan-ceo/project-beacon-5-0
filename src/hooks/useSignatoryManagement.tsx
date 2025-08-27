import { useAppState } from '@/contexts/AppStateContext';
import { CompanySignatory } from '@/types/signatory';

export const useSignatoryManagement = () => {
  const { state } = useAppState();

  const getClientSignatories = (clientId: string): CompanySignatory[] => {
    return state.signatories.filter(s => s.clientId === clientId);
  };

  const getActiveSignatories = (clientId: string): CompanySignatory[] => {
    return getClientSignatories(clientId).filter(s => s.status === 'Active');
  };

  const getPrimarySignatory = (clientId: string): CompanySignatory | undefined => {
    return getActiveSignatories(clientId).find(s => s.isPrimary);
  };

  const getSignatoryById = (signatoryId: string): CompanySignatory | undefined => {
    return state.signatories.find(s => s.id === signatoryId);
  };

  const getSignatoriesByScope = (clientId: string, scope: string): CompanySignatory[] => {
    return getActiveSignatories(clientId).filter(s => 
      s.signingScope.includes('All') || s.signingScope.includes(scope as any)
    );
  };

  const formatSignatoryDisplay = (signatory: CompanySignatory): string => {
    return signatory.designation 
      ? `${signatory.fullName} (${signatory.designation})`
      : signatory.fullName;
  };

  return {
    getClientSignatories,
    getActiveSignatories, 
    getPrimarySignatory,
    getSignatoryById,
    getSignatoriesByScope,
    formatSignatoryDisplay
  };
};
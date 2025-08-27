import { useDataPersistenceContext } from '@/components/providers/DataPersistenceProvider';

export const useDataService = () => {
  const { dataService } = useDataPersistenceContext();
  return dataService;
};
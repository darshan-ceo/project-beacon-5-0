import { useAppState } from '@/contexts/AppStateContext';
import { toast } from '@/hooks/use-toast';

export interface RelationshipValidation {
  isValid: boolean;
  errors: string[];
}

export const useRelationships = () => {
  const { state, dispatch } = useAppState();

  // Validate case has valid client reference
  const validateCaseClient = (clientId: string): RelationshipValidation => {
    const client = state.clients.find(c => c.id === clientId);
    return {
      isValid: !!client,
      errors: client ? [] : [`Client with ID ${clientId} not found`]
    };
  };

  // Validate task has valid case reference
  const validateTaskCase = (caseId: string): RelationshipValidation => {
    const case_ = state.cases.find(c => c.id === caseId);
    return {
      isValid: !!case_,
      errors: case_ ? [] : [`Case with ID ${caseId} not found`]
    };
  };

  // Validate judge belongs to court (judge is optional)
  const validateJudgeCourt = (judgeId: string, courtId: string): RelationshipValidation => {
    const court = state.courts.find(c => c.id === courtId);
    
    // Legal Forum is required
    if (!court) return { isValid: false, errors: [`Legal Forum with ID ${courtId} not found`] };
    
    // Judge is OPTIONAL - if not provided, validation passes
    if (!judgeId || judgeId === '') {
      return { isValid: true, errors: [] };
    }
    
    // If judge IS provided, validate it exists and belongs to the court
    const judge = state.judges.find(j => j.id === judgeId);
    if (!judge) return { isValid: false, errors: [`Judge with ID ${judgeId} not found`] };
    
    if (judge.courtId !== courtId) {
      return { 
        isValid: false, 
        errors: [`Judge ${judge.name} does not belong to court ${court.name}`] 
      };
    }
    
    return { isValid: true, errors: [] };
  };

  // Get client from case
  const getClientFromCase = (caseId: string) => {
    const case_ = state.cases.find(c => c.id === caseId);
    if (!case_) return null;
    return state.clients.find(c => c.id === case_.clientId);
  };

  // Get case details with client
  const getCaseWithClient = (caseId: string) => {
    const case_ = state.cases.find(c => c.id === caseId);
    if (!case_) return null;
    const client = state.clients.find(c => c.id === case_.clientId);
    return { case: case_, client };
  };

  // Get judges for a specific court
  const getJudgesForCourt = (courtId: string) => {
    return state.judges.filter(j => j.courtId === courtId);
  };

  // Get tasks for a case
  const getTasksForCase = (caseId: string) => {
    return state.tasks.filter(t => t.caseId === caseId);
  };

  // Get documents for a case
  const getDocumentsForCase = (caseId: string) => {
    return state.documents.filter(d => d.caseId === caseId);
  };

  // Check if entity has dependencies (for safe deletion)
  const checkDependencies = (type: 'client' | 'court' | 'judge' | 'case', id: string) => {
    let dependencies: string[] = [];

    switch (type) {
      case 'client':
        const clientCases = state.cases.filter(c => c.clientId === id);
        if (clientCases.length > 0) {
          dependencies.push(`${clientCases.length} case(s)`);
        }
        break;
      
      case 'court':
        const courtJudges = state.judges.filter(j => j.courtId === id);
        if (courtJudges.length > 0) {
          dependencies.push(`${courtJudges.length} judge(s)`);
        }
        break;
      
      case 'judge':
        // In future: check hearings assigned to this judge
        break;
      
      case 'case':
        const caseTasks = state.tasks.filter(t => t.caseId === id);
        const caseDocs = state.documents.filter(d => d.caseId === id);
        if (caseTasks.length > 0) dependencies.push(`${caseTasks.length} task(s)`);
        if (caseDocs.length > 0) dependencies.push(`${caseDocs.length} document(s)`);
        break;
    }

    return dependencies;
  };

  // Safe delete with cascade options
  const safeDelete = (type: 'client' | 'court' | 'judge' | 'case', id: string, cascade = false) => {
    const dependencies = checkDependencies(type, id);
    
    if (dependencies.length > 0 && !cascade) {
      toast({
        title: "Cannot Delete",
        description: `This ${type} has ${dependencies.join(', ')}. Delete related items first or use cascade delete.`,
        variant: "destructive"
      });
      return false;
    }

    // Perform cascade delete if requested
    if (cascade) {
      switch (type) {
        case 'client':
          // Delete all cases for this client (and their tasks/documents)
          const clientCases = state.cases.filter(c => c.clientId === id);
          clientCases.forEach(case_ => {
            safeDelete('case', case_.id, true);
          });
          break;
        
        case 'case':
          // Delete all tasks and documents for this case
          state.tasks.filter(t => t.caseId === id).forEach(task => {
            dispatch({ type: 'DELETE_TASK', payload: task.id });
          });
          state.documents.filter(d => d.caseId === id).forEach(doc => {
            dispatch({ type: 'DELETE_DOCUMENT', payload: doc.id });
          });
          break;
      }
    }

    // Delete the main entity
    switch (type) {
      case 'client':
        dispatch({ type: 'DELETE_CLIENT', payload: id });
        break;
      case 'court':
        dispatch({ type: 'DELETE_COURT', payload: id });
        break;
      case 'judge':
        dispatch({ type: 'DELETE_JUDGE', payload: id });
        break;
      case 'case':
        dispatch({ type: 'DELETE_CASE', payload: id });
        break;
    }

    return true;
  };

  return {
    validateCaseClient,
    validateTaskCase,
    validateJudgeCourt,
    getClientFromCase,
    getCaseWithClient,
    getJudgesForCourt,
    getTasksForCase,
    getDocumentsForCase,
    checkDependencies,
    safeDelete
  };
};
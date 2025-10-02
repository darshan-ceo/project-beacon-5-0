// Mark case as complete with review date
import { toast } from '@/hooks/use-toast';
import { AppAction, Case } from '@/contexts/AppStateContext';

export const markCaseComplete = async (
  caseId: string,
  reviewDate: string,
  notes: string | undefined,
  dispatch: React.Dispatch<AppAction>
): Promise<void> => {
  try {
    const completedDate = new Date().toISOString().split('T')[0];
    
    const updates: Partial<Case> = {
      status: 'Completed',
      completedDate,
      reviewDate
    };

    dispatch({
      type: 'UPDATE_CASE',
      payload: { id: caseId, ...updates }
    });

    // Storage persistence handled by dispatcher

    toast({
      title: "Case Marked Complete",
      description: `Case completed successfully. Review scheduled for ${new Date(reviewDate).toLocaleDateString()}`,
    });
  } catch (error) {
    console.error('Failed to mark case complete:', error);
    toast({
      title: "Error",
      description: "Failed to mark case as complete. Please try again.",
      variant: "destructive"
    });
    throw error;
  }
};

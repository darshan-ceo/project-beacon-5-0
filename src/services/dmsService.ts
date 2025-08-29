import { AppAction } from '@/contexts/AppStateContext';
import { toast } from '@/hooks/use-toast';

// Use the Document interface from AppStateContext
interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  caseId: string;
  clientId: string;
  uploadedById: string;
  uploadedByName: string;
  uploadedAt: string;
  tags: string[];
  isShared: boolean;
  path: string;
}

const isDev = import.meta.env.DEV;

const log = (level: 'success' | 'error', tab: string, action: string, details?: any) => {
  if (!isDev) return;
  const color = level === 'success' ? 'color: green' : 'color: red';
  console.log(`%c[Cases] ${tab} ${action} ${level}`, color, details);
};

export const dmsService = {
  uploadForCaseStage: async (
    file: File, 
    caseId: string, 
    stageId: string, 
    dispatch: React.Dispatch<AppAction>
  ): Promise<Document> => {
    try {
      // Simulate file upload
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newDocument: Document = {
        id: `doc-${Date.now()}`,
        name: file.name,
        type: file.type,
        size: file.size,
        caseId,
        clientId: '', // This should be derived from the case
        uploadedById: 'emp-1',
        uploadedByName: 'Current User',
        uploadedAt: new Date().toISOString(),
        tags: [stageId],
        isShared: false,
        path: URL.createObjectURL(file)
      };

      dispatch({ type: 'ADD_DOCUMENT', payload: newDocument });
      
      // Update case document count
      dispatch({ 
        type: 'UPDATE_CASE', 
        payload: { 
          id: caseId, 
          documents: Math.floor(Math.random() * 10) + 1,
          lastUpdated: new Date().toISOString()
        } 
      });
      
      log('success', 'Lifecycle', 'uploadResponse', { 
        documentId: newDocument.id, 
        caseId, 
        stageId, 
        fileName: file.name 
      });
      
      toast({
        title: "Document Uploaded",
        description: `${file.name} has been uploaded successfully.`,
      });

      return newDocument;
    } catch (error) {
      log('error', 'Lifecycle', 'uploadResponse', error);
      toast({
        title: "Upload Error",
        description: "Failed to upload document. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  },

  deleteDocument: async (documentId: string, dispatch: React.Dispatch<AppAction>): Promise<void> => {
    try {
      dispatch({ type: 'DELETE_DOCUMENT', payload: documentId });
      log('success', 'DMS', 'delete', { documentId });
      
      toast({
        title: "Document Deleted",
        description: "Document has been deleted successfully.",
      });
    } catch (error) {
      log('error', 'DMS', 'delete', error);
      toast({
        title: "Error",
        description: "Failed to delete document. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  }
};
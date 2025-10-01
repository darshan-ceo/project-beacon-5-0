import React, { useEffect } from 'react';
import { useUnifiedPersistence } from '@/hooks/useUnifiedPersistence';
import { useProfilePersistence } from '@/hooks/useProfilePersistence';
import { searchService } from '@/services/searchService';
import { generateSampleContent } from '@/utils/fileTypeUtils';
import { loadAppState, saveAppState } from '@/data/storageShim';

interface AppWithPersistenceProps {
  children: React.ReactNode;
}

export const AppWithPersistence: React.FC<AppWithPersistenceProps> = ({ children }) => {
  const { initialized } = useUnifiedPersistence();
  useProfilePersistence();

  // Initialize search provider and backfill document content on app boot
  useEffect(() => {
    // Initialize search provider - this is async but we don't need to wait
    searchService.initProvider?.().catch(error => {
      console.warn('🔍 Failed to initialize search provider:', error);
    });

    // Backfill missing document content for previews using storageShim
    const backfillDocumentContent = async () => {
      try {
        const appState = await loadAppState();
        if (!appState) return;

        const documents = Array.isArray(appState.documents) ? appState.documents : [];
        
        let hasUpdates = false;
        documents.forEach((doc: any) => {
          if (!doc.content && (doc.type || doc.file_type)) {
            // Generate realistic content based on file type
            const extension = doc.name?.split('.').pop()?.toLowerCase() || 'txt';
            doc.content = generateSampleContent(extension, doc.name || 'document');
            hasUpdates = true;
          }
        });

        if (hasUpdates) {
          await saveAppState({ documents });
          console.log('📄 Backfilled content for', documents.filter(d => d.content).length, 'documents');
        }
      } catch (error) {
        console.warn('📄 Failed to backfill document content:', error);
      }
    };

    backfillDocumentContent();
  }, []);

  return <>{children}</>;
};
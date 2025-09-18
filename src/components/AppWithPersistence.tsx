import React, { useEffect } from 'react';
import { useEnhancedPersistence } from '@/hooks/useEnhancedPersistence';
import { useProfilePersistence } from '@/hooks/useProfilePersistence';
import { searchService } from '@/services/searchService';
import { generateSampleContent } from '@/utils/fileTypeUtils';

interface AppWithPersistenceProps {
  children: React.ReactNode;
}

export const AppWithPersistence: React.FC<AppWithPersistenceProps> = ({ children }) => {
  useEnhancedPersistence();
  useProfilePersistence();

  // Initialize search provider and backfill document content on app boot
  useEffect(() => {
    // Initialize search provider - this is async but we don't need to wait
    searchService.initProvider?.().catch(error => {
      console.warn('🔍 Failed to initialize search provider:', error);
    });

    // Backfill missing document content for previews
    const backfillDocumentContent = () => {
      try {
        const appStateStr = localStorage.getItem('lawfirm_app_data');
        if (!appStateStr) return;

        const appState = JSON.parse(appStateStr);
        const documents = Array.isArray(appState.documents) ? appState.documents : [];
        
        let hasUpdates = false;
        documents.forEach(doc => {
          if (!doc.content && doc.type) {
            // Generate realistic content based on file type
            const extension = doc.name?.split('.').pop()?.toLowerCase() || 'txt';
            doc.content = generateSampleContent(extension, doc.name || 'document');
            hasUpdates = true;
          }
        });

        if (hasUpdates) {
          localStorage.setItem('lawfirm_app_data', JSON.stringify(appState));
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
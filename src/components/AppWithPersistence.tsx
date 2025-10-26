import React, { useEffect } from 'react';
import { useUnifiedPersistence } from '@/hooks/useUnifiedPersistence';
import { useProfilePersistence } from '@/hooks/useProfilePersistence';
import { searchService } from '@/services/searchService';
import { storageManager } from '@/data/StorageManager';
import { generateSampleContent } from '@/utils/fileTypeUtils';
import { loadAppState, saveAppState } from '@/data/storageShim';

interface AppWithPersistenceProps {
  children: React.ReactNode;
}

export const AppWithPersistence: React.FC<AppWithPersistenceProps> = ({ children }) => {
  const { initialized, storageHealth } = useUnifiedPersistence();
  useProfilePersistence();

  // Initialize search provider and backfill document content on app boot
  useEffect(() => {
    if (!initialized) return;

    // Initialize StorageManager (Dexie) to ensure it's ready for search
    const initStorageManager = async () => {
      try {
        await storageManager.initialize('indexeddb');
        console.log('✅ StorageManager initialized for search');
      } catch (error) {
        console.warn('⚠️ StorageManager initialization failed:', error);
      }
    };
    initStorageManager();

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
  }, [initialized]);

  // Show loading state while storage initializes
  if (!initialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Initializing storage...</p>
        </div>
      </div>
    );
  }

  // Show error state if storage is unhealthy
  if (storageHealth && !storageHealth.healthy) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4 max-w-md">
          <p className="text-destructive font-semibold">Storage Error</p>
          <p className="text-sm text-muted-foreground">{storageHealth.errors.join(', ')}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
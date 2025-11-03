/**
 * AppWithPersistence - Initializes StorageManager on app startup
 * Handles Supabase/IndexedDB mode selection and health checks
 */

import React, { useEffect, useState } from 'react';
import { StorageManager } from '@/data/StorageManager';
import { envConfig } from '@/utils/envConfig';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { searchService } from '@/services/searchService';
import { generateSampleContent } from '@/utils/fileTypeUtils';
import { loadAppState, saveAppState } from '@/data/storageShim';

interface AppWithPersistenceProps {
  children: React.ReactNode;
}

export const AppWithPersistence: React.FC<AppWithPersistenceProps> = ({ children }) => {
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initStorage = async () => {
      try {
        const storageManager = StorageManager.getInstance();
        const mode = envConfig.getStorageMode();
        
        console.log(`🚀 Initializing storage in ${mode} mode`);
        
        // CRITICAL: Force Supabase storage in production
        if (import.meta.env.MODE === 'production' && mode !== 'supabase') {
          const errorMsg = '❌ Production mode requires Supabase storage backend. Set VITE_STORAGE_BACKEND=supabase in environment variables.';
          console.error(errorMsg);
          toast({
            title: "Configuration Error",
            description: errorMsg,
            variant: "destructive"
          });
          setError(errorMsg);
          return;
        }
        
        // Validate Supabase config if using Supabase mode
        if (mode === 'supabase') {
          try {
            envConfig.assertSupabaseConfigured();
          } catch (configError: any) {
            console.error('❌ Supabase configuration error:', configError);
            toast({
              title: "Configuration Error",
              description: configError.message,
              variant: "destructive"
            });
            setError(configError.message);
            return;
          }
        }

        // Initialize storage manager
        await storageManager.initialize(mode);
        
        // Perform health check
        const health = await storageManager.healthCheck();
        
        if (!health.healthy) {
          console.warn('⚠️ Storage health check warnings:', health.errors);
          
          // Show warning toast but don't block app
          toast({
            title: "Storage Warning",
            description: health.errors[0] || "Some storage features may not work correctly",
            variant: "default"
          });
        } else {
          console.log('✅ Storage health check passed');
        }

        // Initialize search service
        searchService.initProvider?.().catch(error => {
          console.warn('🔍 Failed to initialize search provider:', error);
        });

        // Backfill document content for previews (IndexedDB mode only)
        if (mode === 'indexeddb') {
          const backfillDocumentContent = async () => {
            try {
              const appState = await loadAppState();
              if (!appState) return;

              const documents = Array.isArray(appState.documents) ? appState.documents : [];
              
              let hasUpdates = false;
              documents.forEach((doc: any) => {
                if (!doc.content && (doc.type || doc.file_type)) {
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
        }

        setInitialized(true);
        
      } catch (error: any) {
        console.error('❌ Storage initialization failed:', error);
        setError(error.message || 'Failed to initialize storage');
        
        toast({
          title: "Storage Initialization Failed",
          description: error.message || "Unable to initialize data storage",
          variant: "destructive"
        });
      }
    };

    initStorage();
  }, []);

  // Show loading state while initializing
  if (!initialized && !error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Initializing Application</h2>
            <p className="text-sm text-muted-foreground">
              Setting up {envConfig.getStorageMode()} storage backend...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center space-y-4 max-w-md p-6">
          <div className="text-destructive text-5xl">⚠️</div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-destructive">Initialization Error</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Render app once initialized
  return <>{children}</>;
};
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

// Global flag to track if storage has been initialized (persists across component remounts)
let globalStorageInitialized = false;

interface AppWithPersistenceProps {
  children: React.ReactNode;
}

export const AppWithPersistence: React.FC<AppWithPersistenceProps> = ({ children }) => {
  const [initialized, setInitialized] = useState(globalStorageInitialized);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initStorage = async () => {
      // Quick path: if already initialized globally, skip entirely
      if (globalStorageInitialized) {
        console.log('✅ Storage already initialized globally, skipping re-init');
        return;
      }

      try {
        const storageManager = StorageManager.getInstance();
        const mode = envConfig.getStorageMode();
        
        console.log(`🚀 Initializing storage in ${mode} mode`);
        
        // CRITICAL: Reject any non-Supabase storage mode
        if (mode !== 'supabase') {
          const errorMsg = `❌ FATAL: Only Supabase storage is supported. Detected mode: ${mode}. Remove VITE_STORAGE_BACKEND or set it to 'supabase'.`;
          console.error(errorMsg);
          toast({
            title: "Invalid Storage Configuration",
            description: "Application requires Supabase storage backend.",
            variant: "destructive"
          });
          setError(errorMsg);
          return;
        }
        
        // Additional production guard
        if (import.meta.env.MODE === 'production') {
          console.log('✅ Running in PRODUCTION mode with Supabase');
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

        // Initialize storage manager with improved error handling
        try {
          await storageManager.initialize(mode);
          console.log('✅ Storage manager initialized');
        } catch (initError: any) {
          // If initialization fails due to auth, show a friendly message
          if (initError.message?.includes('not authenticated') || initError.message?.includes('Please login')) {
            console.warn('⚠️ Storage initialization delayed - waiting for authentication');
            toast({
              title: "Initializing Storage",
              description: "Please wait while we connect to the database...",
              duration: 3000
            });
            // Continue anyway - the auth listener will reinitialize when user logs in
          } else {
            throw initError;
          }
        }
        
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

        // IndexedDB backfill removed - Supabase only
        console.log('✅ Supabase storage initialized - no backfill needed');

        // Set global flag to prevent re-initialization on component remount
        globalStorageInitialized = true;
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

  // If globally initialized, skip straight to children
  if (globalStorageInitialized) {
    return <>{children}</>;
  }

  // Show loading state while initializing (only on first load)
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
    const isAuthError = error.includes('not authenticated') || error.includes('Please login');
    
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center space-y-4 max-w-md p-6">
          <div className="text-destructive text-5xl">
            {isAuthError ? '🔐' : '⚠️'}
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-destructive">
              {isAuthError ? 'Authentication Required' : 'Initialization Error'}
            </h2>
            <p className="text-sm text-muted-foreground">{error}</p>
            {isAuthError && (
              <p className="text-sm text-primary font-medium mt-4">
                The storage system will automatically initialize once you log in.
              </p>
            )}
          </div>
          <div className="flex gap-2 justify-center">
            <button 
              onClick={() => window.location.href = '/auth'}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              {isAuthError ? 'Go to Login' : 'Login to Continue'}
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render app once initialized
  return <>{children}</>;
};
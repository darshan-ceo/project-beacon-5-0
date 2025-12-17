import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { automationRuleEngine } from '@/services/automationRuleEngine';
import { automationEventEmitter } from '@/services/automationEventEmitter';

export function useAutomation() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Only initialize automation when user is authenticated
    if (!isAuthenticated) {
      return;
    }

    let initialized = false;

    const initializeAutomation = async () => {
      if (initialized) return;
      
      try {
        console.log('[useAutomation] Initializing automation system');
        
        // Initialize the automation engine
        await automationRuleEngine.initialize();
        
        // Connect event emitter to automation engine
        automationEventEmitter.on('case_stage_changed', async (event) => {
          await automationRuleEngine.processEvent(event);
        });
        
        automationEventEmitter.on('hearing_scheduled', async (event) => {
          await automationRuleEngine.processEvent(event);
        });
        
        automationEventEmitter.on('task_overdue', async (event) => {
          await automationRuleEngine.processEvent(event);
        });
        
        automationEventEmitter.on('document_uploaded', async (event) => {
          await automationRuleEngine.processEvent(event);
        });
        
        automationEventEmitter.on('case_created', async (event) => {
          await automationRuleEngine.processEvent(event);
        });
        
        initialized = true;
        console.log('[useAutomation] Automation system initialized (server-side scheduling active)');
      } catch (error) {
        console.error('[useAutomation] Failed to initialize:', error);
      }
    };

    initializeAutomation();

    return () => {
      // Cleanup on unmount
      automationEventEmitter.clearAllListeners();
    };
  }, [isAuthenticated]);
}

/**
 * Help Enforcement Hook
 * Shows warnings in development when navigating to modules with incomplete help
 */

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { moduleRegistry } from '@/registry/moduleRegistry';
import { helpValidationService } from '@/services/helpValidationService';

interface EnforcementOptions {
  enabled?: boolean;
  showToast?: boolean;
  showConsole?: boolean;
}

export const useHelpEnforcement = (options: EnforcementOptions = {}) => {
  const location = useLocation();
  const lastCheckedPath = useRef<string>('');
  
  const {
    enabled = process.env.NODE_ENV === 'development',
    showToast = true,
    showConsole = true
  } = options;

  useEffect(() => {
    if (!enabled) return;
    
    // Avoid duplicate checks for same path
    if (lastCheckedPath.current === location.pathname) return;
    lastCheckedPath.current = location.pathname;

    const checkHelpCoverage = async () => {
      const module = moduleRegistry.getModuleByRoute(location.pathname);
      
      if (!module) return;
      
      // Skip modules that don't require help
      const requiresHelp = 
        module.helpRequired.tooltips || 
        module.helpRequired.operationsHelp || 
        module.helpRequired.tour || 
        module.helpRequired.faq ||
        module.helpRequired.pagesHelp;
      
      if (!requiresHelp) return;

      try {
        const result = await helpValidationService.validateModule(module.id);
        
        if (!result.isComplete) {
          const missingItems: string[] = [];
          
          if (result.missing.tooltips.length > 0) {
            missingItems.push(`${result.missing.tooltips.length} tooltips`);
          }
          if (result.missing.tours.length > 0) {
            missingItems.push('tour');
          }
          if (result.missing.operations) {
            missingItems.push('operations help');
          }
          if (result.missing.pagesHelp) {
            missingItems.push('page help');
          }
          if (result.missing.faq.length > 0) {
            missingItems.push('FAQ');
          }

          if (showConsole) {
            console.warn(
              `[HELP ENFORCEMENT] Module "${module.name}" has incomplete help documentation.`,
              {
                moduleId: module.id,
                coverage: `${result.coverage}%`,
                missing: result.missing,
                warnings: result.warnings
              }
            );
          }

          if (showToast && missingItems.length > 0) {
            toast({
              title: `Help incomplete: ${module.name}`,
              description: `Missing: ${missingItems.join(', ')}. Coverage: ${result.coverage}%`,
              variant: 'default',
              duration: 5000,
            });
          }
        }
      } catch (error) {
        console.error('[HELP ENFORCEMENT] Error checking coverage:', error);
      }
    };

    // Debounce the check to avoid rapid firing during navigation
    const timeoutId = setTimeout(checkHelpCoverage, 500);
    
    return () => clearTimeout(timeoutId);
  }, [location.pathname, enabled, showToast, showConsole]);
};

export default useHelpEnforcement;

/**
 * Help Validation Service
 * Validates help documentation coverage for each module
 */

import { moduleRegistry, ModuleRegistration } from '@/registry/moduleRegistry';

export interface ValidationResult {
  moduleId: string;
  moduleName: string;
  isComplete: boolean;
  coverage: number;
  missing: {
    tooltips: string[];
    tours: string[];
    operations: boolean;
    faq: string[];
    pagesHelp: boolean;
  };
  found: {
    tooltipCount: number;
    tourCount: number;
    hasOperations: boolean;
    faqCount: number;
    hasPagesHelp: boolean;
  };
  warnings: string[];
}

export interface CoverageReport {
  generatedAt: string;
  overallCoverage: number;
  moduleResults: ValidationResult[];
  summary: {
    totalModules: number;
    completeModules: number;
    partialModules: number;
    incompleteModules: number;
  };
  thresholds: {
    tooltips: number;
    tours: number;
    operations: number;
    faq: number;
    pagesHelp: number;
  };
}

class HelpValidationService {
  private manifest: any = null;
  private tooltipsData: any = null;
  private toursData: any = null;
  private operationsFiles: Set<string> = new Set();
  private pagesHelpFiles: Set<string> = new Set();
  private faqFiles: Set<string> = new Set();
  private isLoaded = false;

  private thresholds = {
    tooltips: 0.8,      // 80% tooltip coverage required
    tours: 1.0,         // 100% tour coverage required
    operations: 1.0,    // 100% operations help required
    faq: 0.7,           // 70% FAQ coverage required
    pagesHelp: 1.0      // 100% page help required
  };

  /**
   * Load all help data for validation
   */
  async loadHelpData(): Promise<void> {
    if (this.isLoaded) return;

    try {
      // Load manifest
      const manifestRes = await fetch('/help/manifest.json');
      if (manifestRes.ok) {
        this.manifest = await manifestRes.json();
      }

      // Load tooltips
      const tooltipsRes = await fetch('/help/ui-tooltips.json');
      if (tooltipsRes.ok) {
        this.tooltipsData = await tooltipsRes.json();
      }

      // Load tours
      const toursRes = await fetch('/help/tours.json');
      if (toursRes.ok) {
        this.toursData = await toursRes.json();
      }

      // Track operations files that exist
      const operationsModules = [
        'case-management', 'hearings', 'tasks', 'documents', 
        'clients', 'communications', 'reports'
      ];
      for (const mod of operationsModules) {
        try {
          const res = await fetch(`/help/operations/${mod}-ops.json`);
          if (res.ok) {
            this.operationsFiles.add(mod);
          }
        } catch {
          // File doesn't exist
        }
      }

      // Track pages help files
      const pagesModules = [
        'dashboard', 'case-management', 'hearings', 'tasks', 
        'documents', 'clients', 'reports', 'settings', 'access-roles'
      ];
      for (const mod of pagesModules) {
        try {
          const res = await fetch(`/help/pages/${mod}.json`);
          if (res.ok) {
            this.pagesHelpFiles.add(mod);
          }
        } catch {
          // File doesn't exist
        }
      }

      // Track FAQ files
      const faqTopics = [
        'getting-started', 'case-management', 'hearings', 
        'tasks', 'documents', 'troubleshooting'
      ];
      for (const topic of faqTopics) {
        try {
          const res = await fetch(`/help/faqs/${topic}.md`);
          if (res.ok) {
            this.faqFiles.add(topic);
          }
        } catch {
          // File doesn't exist
        }
      }

      this.isLoaded = true;
      console.log('✅ Help Validation Service: Data loaded');
    } catch (error) {
      console.error('❌ Help Validation Service: Failed to load data', error);
    }
  }

  /**
   * Validate help coverage for a specific module
   */
  async validateModule(moduleId: string): Promise<ValidationResult> {
    await this.loadHelpData();

    const module = moduleRegistry.getModule(moduleId);
    if (!module) {
      return {
        moduleId,
        moduleName: 'Unknown',
        isComplete: false,
        coverage: 0,
        missing: {
          tooltips: [],
          tours: [],
          operations: true,
          faq: [],
          pagesHelp: true
        },
        found: {
          tooltipCount: 0,
          tourCount: 0,
          hasOperations: false,
          faqCount: 0,
          hasPagesHelp: false
        },
        warnings: [`Module "${moduleId}" not found in registry`]
      };
    }

    const result: ValidationResult = {
      moduleId,
      moduleName: module.name,
      isComplete: true,
      coverage: 100,
      missing: {
        tooltips: [],
        tours: [],
        operations: false,
        faq: [],
        pagesHelp: false
      },
      found: {
        tooltipCount: 0,
        tourCount: 0,
        hasOperations: false,
        faqCount: 0,
        hasPagesHelp: false
      },
      warnings: []
    };

    let requiredItems = 0;
    let foundItems = 0;

    // Check tooltips
    if (module.helpRequired.tooltips) {
      requiredItems++;
      const moduleTooltips = this.getTooltipsForModule(moduleId);
      result.found.tooltipCount = moduleTooltips.length;
      
      if (moduleTooltips.length >= 3) {
        foundItems++;
      } else {
        result.missing.tooltips = ['Insufficient tooltips (minimum 3 required)'];
        result.warnings.push(`Module has only ${moduleTooltips.length} tooltips`);
      }
    }

    // Check tours
    if (module.helpRequired.tour) {
      requiredItems++;
      const moduleTours = this.getToursForModule(moduleId);
      result.found.tourCount = moduleTours.length;
      
      if (moduleTours.length >= 1) {
        foundItems++;
      } else {
        result.missing.tours = [`No tour found for ${moduleId}`];
      }
    }

    // Check operations help
    if (module.helpRequired.operationsHelp) {
      requiredItems++;
      const hasOps = this.operationsFiles.has(moduleId);
      result.found.hasOperations = hasOps;
      
      if (hasOps) {
        foundItems++;
      } else {
        result.missing.operations = true;
      }
    }

    // Check pages help
    if (module.helpRequired.pagesHelp) {
      requiredItems++;
      const hasPages = this.pagesHelpFiles.has(moduleId);
      result.found.hasPagesHelp = hasPages;
      
      if (hasPages) {
        foundItems++;
      } else {
        result.missing.pagesHelp = true;
      }
    }

    // Check FAQ
    if (module.helpRequired.faq) {
      requiredItems++;
      const hasFaq = this.faqFiles.has(moduleId) || this.faqFiles.has('getting-started');
      result.found.faqCount = hasFaq ? 1 : 0;
      
      if (hasFaq) {
        foundItems++;
      } else {
        result.missing.faq = [`No FAQ for ${moduleId}`];
      }
    }

    // Calculate coverage
    result.coverage = requiredItems > 0 ? Math.round((foundItems / requiredItems) * 100) : 100;
    result.isComplete = result.coverage === 100;

    // Update registry
    moduleRegistry.setHelpValidated(moduleId, result.isComplete);

    return result;
  }

  /**
   * Get tooltips for a module from the tooltips data
   */
  private getTooltipsForModule(moduleId: string): any[] {
    if (!this.tooltipsData?.modules) return [];
    
    // Map module IDs to tooltip module keys
    const moduleKeyMap: Record<string, string[]> = {
      'case-management': ['case-management', 'cases'],
      'hearings': ['hearings'],
      'tasks': ['tasks'],
      'documents': ['documents'],
      'clients': ['clients'],
      'communications': ['communications'],
      'reports': ['reports'],
      'masters': ['masters', 'master-data'],
      'settings': ['settings', 'system-settings'],
      'access-roles': ['access-roles', 'rbac'],
      'dashboard': ['dashboard'],
      'data-io': ['data-io', 'import-export'],
      'profile': ['profile', 'user-profile']
    };

    const keys = moduleKeyMap[moduleId] || [moduleId];
    let tooltips: any[] = [];

    for (const key of keys) {
      const moduleData = this.tooltipsData.modules[key];
      if (moduleData) {
        // Collect all tooltip types
        ['buttons', 'fields', 'menu-items', 'cards', 'features'].forEach(type => {
          if (moduleData[type]) {
            tooltips = tooltips.concat(moduleData[type]);
          }
        });
      }
    }

    return tooltips;
  }

  /**
   * Get tours for a module
   */
  private getToursForModule(moduleId: string): any[] {
    if (!this.toursData?.tours) return [];
    
    return this.toursData.tours.filter((tour: any) => 
      tour.module === moduleId || 
      tour.id.includes(moduleId) ||
      tour.category === moduleId
    );
  }

  /**
   * Get all modules with incomplete help
   */
  async getIncompleteModules(): Promise<ValidationResult[]> {
    const modules = moduleRegistry.getModulesRequiringHelp();
    const results: ValidationResult[] = [];

    for (const module of modules) {
      const result = await this.validateModule(module.id);
      if (!result.isComplete) {
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Generate comprehensive coverage report
   */
  async generateCoverageReport(): Promise<CoverageReport> {
    const modules = moduleRegistry.getModulesRequiringHelp();
    const results: ValidationResult[] = [];

    for (const module of modules) {
      const result = await this.validateModule(module.id);
      results.push(result);
    }

    const complete = results.filter(r => r.coverage === 100).length;
    const partial = results.filter(r => r.coverage > 0 && r.coverage < 100).length;
    const incomplete = results.filter(r => r.coverage === 0).length;

    const overallCoverage = results.length > 0
      ? Math.round(results.reduce((sum, r) => sum + r.coverage, 0) / results.length)
      : 0;

    return {
      generatedAt: new Date().toISOString(),
      overallCoverage,
      moduleResults: results,
      summary: {
        totalModules: modules.length,
        completeModules: complete,
        partialModules: partial,
        incompleteModules: incomplete
      },
      thresholds: this.thresholds
    };
  }

  /**
   * Enforce help presence (logs warning in dev mode)
   */
  async enforceHelpPresence(moduleId: string): Promise<{ 
    passed: boolean; 
    message: string;
    result: ValidationResult;
  }> {
    const result = await this.validateModule(moduleId);
    
    if (!result.isComplete) {
      const message = `[HELP ENFORCEMENT] Module "${moduleId}" is missing help documentation. Coverage: ${result.coverage}%`;
      
      if (process.env.NODE_ENV === 'development') {
        console.warn(message, {
          missing: result.missing,
          warnings: result.warnings
        });
      }

      return { passed: false, message, result };
    }

    return { 
      passed: true, 
      message: `Module "${moduleId}" has complete help documentation`,
      result 
    };
  }

  /**
   * Check if help system is ready
   */
  isReady(): boolean {
    return this.isLoaded;
  }

  /**
   * Get current thresholds
   */
  getThresholds() {
    return { ...this.thresholds };
  }

  /**
   * Set coverage thresholds
   */
  setThresholds(thresholds: Partial<typeof this.thresholds>) {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }
}

export const helpValidationService = new HelpValidationService();

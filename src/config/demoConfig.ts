/**
 * Demo Configuration - Centralized settings for DEMO mode
 */

import { envConfig } from '@/utils/envConfig';

export interface DemoSettings {
  // Data generation
  maxRecordsPerEntity: number;
  autoSeedOnInit: boolean;
  
  // Import/Export
  maxImportSize: number; // bytes
  allowedImportFormats: string[];
  conflictPolicyDefault: 'skip' | 'merge' | 'create_new';
  
  // Feature flags
  enableTaskAutomation: boolean;
  enableDocumentPreview: boolean;
  enableTimelineTracking: boolean;
  
  // UI behavior
  showDemoIndicator: boolean;
  simulateLoadingDelays: boolean;
  maxLoadingDelay: number; // ms
  
  // Storage
  enableDataPersistence: boolean;
  enableDataMigration: boolean;
  enableLegacySupport: boolean;
}

const defaultDemoSettings: DemoSettings = {
  // Data generation
  maxRecordsPerEntity: 1000,
  autoSeedOnInit: false,
  
  // Import/Export
  maxImportSize: 10 * 1024 * 1024, // 10MB
  allowedImportFormats: ['.xlsx', '.csv', '.json'],
  conflictPolicyDefault: 'merge',
  
  // Feature flags
  enableTaskAutomation: true,
  enableDocumentPreview: true,
  enableTimelineTracking: true,
  
  // UI behavior
  showDemoIndicator: true,
  simulateLoadingDelays: false,
  maxLoadingDelay: 1000,
  
  // Storage
  enableDataPersistence: true,
  enableDataMigration: true,
  enableLegacySupport: true
};

class DemoConfig {
  private settings: DemoSettings;

  constructor() {
    this.settings = { ...defaultDemoSettings };
    this.applyUrlOverrides();
  }

  private applyUrlOverrides(): void {
    if (typeof window === 'undefined') return;
    
    const params = new URLSearchParams(window.location.search);
    
    // Apply URL parameter overrides
    if (params.get('seed') === 'true') {
      this.settings.autoSeedOnInit = true;
    }
    
    if (params.get('delays') === 'true') {
      this.settings.simulateLoadingDelays = true;
    }
    
    if (params.get('indicator') === 'false') {
      this.settings.showDemoIndicator = false;
    }
  }

  get(): DemoSettings {
    return { ...this.settings };
  }

  set(updates: Partial<DemoSettings>): void {
    this.settings = { ...this.settings, ...updates };
  }

  // Feature flags
  isFeatureEnabled(feature: keyof Pick<DemoSettings, 'enableTaskAutomation' | 'enableDocumentPreview' | 'enableTimelineTracking'>): boolean {
    return this.settings[feature];
  }

  // Validation
  validateImportSize(size: number): boolean {
    return size <= this.settings.maxImportSize;
  }

  validateImportFormat(filename: string): boolean {
    const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return this.settings.allowedImportFormats.includes(extension);
  }

  // Demo mode guards
  assertDemoMode(): void {
    if (!envConfig.IS_DEMO_MODE) {
      throw new Error('Operation only allowed in DEMO mode');
    }
  }

  // URL parameter helpers
  getDemoUrl(params: Record<string, string | boolean> = {}): string {
    const url = new URL(window.location.href);
    url.searchParams.set('mode', 'demo');
    url.searchParams.set('storage', 'indexeddb');
    
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, String(value));
    });
    
    return url.toString();
  }

  // Error handling
  handleError(error: Error, context: string): void {
    console.error(`[DEMO] ${context}:`, error);
    
    // In demo mode, show user-friendly toast instead of throwing
    if (typeof window !== 'undefined' && 'toast' in window) {
      // @ts-ignore - toast will be available globally
      window.toast({
        title: 'Demo Mode Error',
        description: `${context}: ${error.message}`,
        variant: 'destructive'
      });
    }
  }

  // Development helpers
  isDevelopment(): boolean {
    return import.meta.env.DEV;
  }

  enableDebugMode(): void {
    if (this.isDevelopment()) {
      this.settings.simulateLoadingDelays = true;
      this.settings.showDemoIndicator = true;
      console.log('🧪 Demo debug mode enabled');
    }
  }

  // Performance monitoring
  measureOperation<T>(name: string, operation: () => Promise<T>): Promise<T> {
    if (!this.isDevelopment()) {
      return operation();
    }

    const start = performance.now();
    return operation().finally(() => {
      const duration = performance.now() - start;
      console.log(`[DEMO PERF] ${name}: ${duration.toFixed(2)}ms`);
    });
  }

  // Simulate loading delays for better UX testing
  async simulateDelay(): Promise<void> {
    if (!this.settings.simulateLoadingDelays) return;
    
    const delay = Math.random() * this.settings.maxLoadingDelay;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

export const demoConfig = new DemoConfig();
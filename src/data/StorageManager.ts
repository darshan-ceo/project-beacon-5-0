/**
 * Storage Manager - Factory and configuration for storage adapters
 * Provides unified interface for data persistence
 */

import { StoragePort } from './ports/StoragePort';
import { SupabaseAdapter } from './adapters/SupabaseAdapter';
import { TaskBundleRepository } from './repositories/TaskBundleRepository';
import { EnhancedTaskBundleRepository } from './repositories/EnhancedTaskBundleRepository';
import { DocumentRepository } from './repositories/DocumentRepository';
import { AuditService } from './services/AuditService';

// ONLY Supabase mode supported - all local storage adapters removed
export type StorageMode = 'supabase';

export class StorageManager {
  private static instance: StorageManager;
  private storage: StoragePort | null = null;
  private auditService: AuditService | null = null;
  private taskBundleRepository: TaskBundleRepository | null = null;
  private enhancedTaskBundleRepository: EnhancedTaskBundleRepository | null = null;
  private documentRepository: DocumentRepository | null = null;
  private automationRuleRepository: any | null = null;
  private automationLogRepository: any | null = null;

  private constructor() {}

  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  async initialize(mode: StorageMode = 'supabase'): Promise<void> {
    // FORCE SUPABASE ONLY - No fallback to local storage
    if (mode !== 'supabase') {
      throw new Error(
        `❌ FATAL: Only Supabase storage mode is supported. Received: ${mode}. ` +
        `Remove VITE_STORAGE_BACKEND from environment or set it to 'supabase'.`
      );
    }
    
    console.log('🚀 Initializing storage in Supabase-only mode');
    
    try {
      // Validate Supabase environment variables
      if (!import.meta.env.VITE_SUPABASE_URL) {
        throw new Error('❌ VITE_SUPABASE_URL is not configured');
      }
      if (!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
        throw new Error('❌ VITE_SUPABASE_PUBLISHABLE_KEY is not configured');
      }
      
      console.log('🗄️ Using Supabase PostgreSQL backend');
      this.storage = new SupabaseAdapter();

      await this.storage.initialize();

      // Initialize repositories
      this.auditService = new AuditService(this.storage);
      this.taskBundleRepository = new TaskBundleRepository(this.storage, this.auditService);
      this.enhancedTaskBundleRepository = new EnhancedTaskBundleRepository(this.storage, this.auditService);
      this.documentRepository = new DocumentRepository(this.storage, this.auditService);
      
      // Import and initialize automation repositories
      const { AutomationRuleRepository, AutomationLogRepository } = await import('./repositories/AutomationRuleRepository');
      this.automationRuleRepository = new AutomationRuleRepository(this.storage, this.auditService);
      this.automationLogRepository = new AutomationLogRepository(this.storage, this.auditService);

      console.log('✅ Storage system initialized successfully');
    } catch (error) {
      console.error('❌ Storage initialization failed:', error);
      throw error;
    }
  }

  getStorage(): StoragePort {
    if (!this.storage) {
      throw new Error('StorageManager not initialized - call initialize() first');
    }
    return this.storage;
  }

  getAuditService(): AuditService {
    if (!this.auditService) {
      throw new Error('StorageManager not initialized - call initialize() first');
    }
    return this.auditService;
  }

  getTaskBundleRepository(): TaskBundleRepository {
    if (!this.taskBundleRepository) {
      throw new Error('StorageManager not initialized - call initialize() first');
    }
    return this.taskBundleRepository;
  }

  getEnhancedTaskBundleRepository(): EnhancedTaskBundleRepository {
    if (!this.enhancedTaskBundleRepository) {
      throw new Error('StorageManager not initialized - call initialize() first');
    }
    return this.enhancedTaskBundleRepository;
  }

  getDocumentRepository(): DocumentRepository {
    if (!this.documentRepository) {
      throw new Error('StorageManager not initialized - call initialize() first');
    }
    return this.documentRepository;
  }

  getAutomationRuleRepository(): any {
    if (!this.automationRuleRepository) {
      throw new Error('StorageManager not initialized - call initialize() first');
    }
    return this.automationRuleRepository;
  }

  getAutomationLogRepository(): any {
    if (!this.automationLogRepository) {
      throw new Error('StorageManager not initialized - call initialize() first');
    }
    return this.automationLogRepository;
  }

  async healthCheck(): Promise<{ healthy: boolean; errors: string[]; info: any }> {
    if (!this.storage) {
      return {
        healthy: false,
        errors: ['Storage not initialized'],
        info: null
      };
    }

    try {
      const storageHealth = await this.storage.healthCheck();
      const storageInfo = await this.storage.getStorageInfo();
      
      return {
        healthy: storageHealth.healthy,
        errors: storageHealth.errors,
          info: {
            storage: storageInfo,
            repositories: {
              taskBundle: !!this.taskBundleRepository,
              enhancedTaskBundle: !!this.enhancedTaskBundleRepository,
              document: !!this.documentRepository,
              audit: !!this.auditService,
              automationRule: !!this.automationRuleRepository,
              automationLog: !!this.automationLogRepository
            }
          }
      };
    } catch (error) {
      return {
        healthy: false,
        errors: [`Health check failed: ${error}`],
        info: null
      };
    }
  }

  async destroy(): Promise<void> {
    if (this.storage) {
      await this.storage.destroy();
      this.storage = null;
      this.auditService = null;
      this.taskBundleRepository = null;
      this.enhancedTaskBundleRepository = null;
      this.documentRepository = null;
      this.automationRuleRepository = null;
      this.automationLogRepository = null;
    }
  }

  /**
   * Enable real-time synchronization
   */
  async enableRealTimeSync(config?: any): Promise<void> {
    const { realtimePreparationService } = await import('@/services/realtimePreparationService');
    
    await realtimePreparationService.initialize({
      enabled: true,
      ...config,
    });

    console.log('✅ Real-time sync enabled');
  }
}

// Singleton export
export const storageManager = StorageManager.getInstance();
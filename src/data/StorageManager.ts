/**
 * Storage Manager - Factory and configuration for storage adapters
 * Provides unified interface for data persistence
 */

import { StoragePort, StorageConfig } from './ports/StoragePort';
import { IndexedDBAdapter } from './adapters/IndexedDBAdapter';
import { InMemoryAdapter } from './adapters/InMemoryAdapter';
// ApiAdapter removed - deprecated after Supabase migration
import { HybridAdapter } from './adapters/HybridAdapter';
import { SupabaseAdapter } from './adapters/SupabaseAdapter';
import { SimulatedApiAdapter } from './adapters/SimulatedApiAdapter';
import { TaskBundleRepository } from './repositories/TaskBundleRepository';
import { EnhancedTaskBundleRepository } from './repositories/EnhancedTaskBundleRepository';
import { DocumentRepository } from './repositories/DocumentRepository';
import { AuditService } from './services/AuditService';

export type StorageMode = 'indexeddb' | 'memory' | 'api' | 'hybrid' | 'supabase';

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
    console.log(`🚀 Initializing storage in ${mode} mode`);
    
    try {
      // Initialize storage adapter
      switch (mode) {
        case 'supabase':
          console.log('🗄️ Using Supabase PostgreSQL backend');
          this.storage = new SupabaseAdapter();
          break;
        case 'indexeddb':
          this.storage = new IndexedDBAdapter();
          break;
        case 'memory':
          this.storage = new InMemoryAdapter();
          break;
        case 'api':
          // ApiAdapter deprecated - use Supabase instead
          throw new Error('API mode is deprecated. Use "supabase" mode instead.');
        case 'hybrid':
          const localAdapter = new IndexedDBAdapter();
          const cloudAdapter = new SimulatedApiAdapter('cloud_api', {
            baseDelay: 300,
            failureRate: 0.02,
            enabled: true,
          });
          this.storage = new HybridAdapter({
            localAdapter,
            cloudAdapter,
            syncMode: 'batched',
            batchInterval: 5000,
            enableRealtime: true,
          });
          break;
        default:
          throw new Error(`Unknown storage mode: ${mode}`);
      }

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
/**
 * Storage Manager - Factory and configuration for storage adapters
 * Provides unified interface for data persistence
 */

import { StoragePort, StorageConfig } from './ports/StoragePort';
import { IndexedDBAdapter } from './adapters/IndexedDBAdapter';
import { InMemoryAdapter } from './adapters/InMemoryAdapter';
import { ApiAdapter } from './adapters/ApiAdapter';
import { TaskBundleRepository } from './repositories/TaskBundleRepository';
import { DocumentRepository } from './repositories/DocumentRepository';
import { AuditService } from './services/AuditService';

export type StorageMode = 'indexeddb' | 'memory' | 'api';

export class StorageManager {
  private static instance: StorageManager;
  private storage: StoragePort | null = null;
  private auditService: AuditService | null = null;
  private taskBundleRepository: TaskBundleRepository | null = null;
  private documentRepository: DocumentRepository | null = null;

  private constructor() {}

  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  async initialize(mode: StorageMode = 'indexeddb'): Promise<void> {
    console.log(`🚀 Initializing storage in ${mode} mode`);
    
    try {
      // Initialize storage adapter
      switch (mode) {
        case 'indexeddb':
          this.storage = new IndexedDBAdapter();
          break;
        case 'memory':
          this.storage = new InMemoryAdapter();
          break;
        case 'api':
          this.storage = new ApiAdapter();
          break;
        default:
          throw new Error(`Unknown storage mode: ${mode}`);
      }

      await this.storage.initialize();

      // Initialize repositories
      this.auditService = new AuditService(this.storage);
      this.taskBundleRepository = new TaskBundleRepository(this.storage, this.auditService);
      this.documentRepository = new DocumentRepository(this.storage, this.auditService);

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

  getDocumentRepository(): DocumentRepository {
    if (!this.documentRepository) {
      throw new Error('StorageManager not initialized - call initialize() first');
    }
    return this.documentRepository;
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
            document: !!this.documentRepository,
            audit: !!this.auditService
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
      this.documentRepository = null;
    }
  }
}

// Singleton export
export const storageManager = StorageManager.getInstance();
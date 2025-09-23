/**
 * Storage Manager - Factory and configuration for storage adapters
 */

import { StoragePort, StorageConfig } from './ports/StoragePort';
import { IndexedDBAdapter } from './adapters/IndexedDBAdapter';
import { InMemoryAdapter } from './adapters/InMemoryAdapter';
import { ApiAdapter } from './adapters/ApiAdapter';
import { TaskBundleRepository } from './repositories/TaskBundleRepository';
import { AuditService } from './services/AuditService';

export type StorageMode = 'indexeddb' | 'memory' | 'api';

export class StorageManager {
  private static instance: StorageManager;
  private storage: StoragePort | null = null;
  private auditService: AuditService | null = null;
  private taskBundleRepo: TaskBundleRepository | null = null;

  private constructor() {}

  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  async initialize(mode?: StorageMode): Promise<void> {
    const storageMode = mode || this.getStorageMode();
    const config: StorageConfig = {
      databaseName: process.env.DB_NAME || 'hoffice_dev_local',
      version: 2
    };

    console.log(`🏗️ Initializing storage in ${storageMode} mode...`);

    switch (storageMode) {
      case 'indexeddb':
        this.storage = new IndexedDBAdapter(config);
        break;
      case 'memory':
        this.storage = new InMemoryAdapter(config);
        break;
      case 'api':
        this.storage = new ApiAdapter({ ...config, apiBaseUrl: process.env.API_BASE_URL });
        break;
      default:
        throw new Error(`Unsupported storage mode: ${storageMode}`);
    }

    await this.storage.initialize();

    // Initialize services
    this.auditService = new AuditService(this.storage);

    // Initialize repositories
    this.taskBundleRepo = new TaskBundleRepository(this.storage, this.auditService);

    console.log(`✅ Storage initialized successfully in ${storageMode} mode`);
  }

  private getStorageMode(): StorageMode {
    const devMode = process.env.DEV_MODE?.toLowerCase();
    
    switch (devMode) {
      case 'api':
        return 'api';
      case 'memory':
        return 'memory';
      case 'local':
      default:
        return 'indexeddb';
    }
  }

  getStorage(): StoragePort {
    if (!this.storage) {
      throw new Error('Storage not initialized. Call initialize() first.');
    }
    return this.storage;
  }

  getAuditService(): AuditService {
    if (!this.auditService) {
      throw new Error('Storage not initialized. Call initialize() first.');
    }
    return this.auditService;
  }

  getTaskBundleRepository(): TaskBundleRepository {
    if (!this.taskBundleRepo) {
      throw new Error('Storage not initialized. Call initialize() first.');
    }
    return this.taskBundleRepo;
  }

  async healthCheck(): Promise<{ healthy: boolean; errors: string[]; info: any }> {
    if (!this.storage) {
      return { healthy: false, errors: ['Storage not initialized'], info: {} };
    }

    const healthResult = await this.storage.healthCheck();
    const storageInfo = await this.storage.getStorageInfo();

    return {
      ...healthResult,
      info: {
        mode: this.getStorageMode(),
        ...storageInfo
      }
    };
  }

  async destroy(): Promise<void> {
    if (this.storage) {
      await this.storage.destroy();
      this.storage = null;
      this.auditService = null;
      this.taskBundleRepo = null;
    }
  }
}

// Export singleton instance
export const storageManager = StorageManager.getInstance();
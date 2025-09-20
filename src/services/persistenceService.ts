import { idbStorage } from '@/utils/idb';
import { AppState, Case, Client, Court, Judge, Employee, Hearing, Task, Document, Folder } from '@/contexts/AppStateContext';
import { toast } from '@/hooks/use-toast';

// Entity types for type-safe operations
export type EntityType = 'cases' | 'clients' | 'courts' | 'judges' | 'employees' | 'hearings' | 'tasks' | 'documents' | 'folders';

export interface EntityOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: EntityType;
  data?: any;
  timestamp: string;
}

export interface StorageHealth {
  isHealthy: boolean;
  used: number;
  available: number;
  errors: string[];
  quotaWarning: boolean;
}

class PersistenceService {
  private operationQueue: EntityOperation[] = [];
  private isProcessing = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startHealthMonitoring();
  }

  // Health monitoring with adaptive frequency
  private startHealthMonitoring() {
    let healthCheckFrequency = 60000; // Start with 60 seconds
    
    this.healthCheckInterval = setInterval(async () => {
      const health = await this.checkStorageHealth();
      
      if (!health.isHealthy) {
        console.warn('[Persistence] Storage health issues detected:', health.errors);
        // Increase frequency when issues are detected
        healthCheckFrequency = Math.max(10000, healthCheckFrequency * 0.5);
        this.restartHealthMonitoring(healthCheckFrequency);
      } else {
        // Decrease frequency when healthy
        healthCheckFrequency = Math.min(120000, healthCheckFrequency * 1.1);
        if (healthCheckFrequency > 60000) {
          this.restartHealthMonitoring(healthCheckFrequency);
        }
      }
    }, healthCheckFrequency);
  }

  private restartHealthMonitoring(newFrequency: number) {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    this.healthCheckInterval = setInterval(async () => {
      const health = await this.checkStorageHealth();
      if (!health.isHealthy) {
        console.warn('[Persistence] Storage health issues detected:', health.errors);
      }
    }, newFrequency);
    
    console.log(`[Persistence] Health check frequency adjusted to ${newFrequency}ms`);
  }

  async checkStorageHealth(retryCount = 0): Promise<StorageHealth> {
    const maxRetries = 3;
    const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff
    
    try {
      console.log(`[Storage Health] Starting health check (attempt ${retryCount + 1}/${maxRetries + 1})`);
      
      const stats = await idbStorage.getStorageStats();
      const quotaWarning = stats.available < (1024 * 1024); // Warn if less than 1MB available
      
      console.log(`[Storage Health] Storage stats - Used: ${stats.used}, Available: ${stats.available}`);
      
      // Enhanced read/write test with detailed logging
      const testKey = `health-check-${Date.now()}`;
      const testData = { 
        timestamp: Date.now(),
        randomValue: Math.random(),
        testId: crypto.randomUUID?.() || Math.random().toString(36),
        browser: navigator.userAgent.split(' ')[0],
        attempt: retryCount + 1
      };
      
      console.log(`[Storage Health] Writing test data:`, testData);
      
      // Use isolated transaction for health check
      await this.performIsolatedWrite(testKey, testData);
      
      console.log(`[Storage Health] Reading back test data...`);
      const retrieved = await this.performIsolatedRead(testKey);
      
      console.log(`[Storage Health] Retrieved data:`, retrieved);
      
      // Cleanup test data
      await this.performIsolatedDelete(testKey);
      
      // Validate data integrity
      const isDataValid = this.validateTestData(testData, retrieved);
      const errors: string[] = [];
      
      if (!retrieved) {
        errors.push('Read operation returned null');
      } else if (!isDataValid) {
        errors.push(`Data corruption detected - Expected: ${JSON.stringify(testData)}, Got: ${JSON.stringify(retrieved)}`);
      }
      
      // Check for concurrent operation conflicts
      const hasConflicts = await this.detectConcurrentOperations();
      if (hasConflicts) {
        errors.push('Concurrent operation conflicts detected');
      }
      
      // Browser-specific checks
      const browserIssues = this.checkBrowserCompatibility();
      errors.push(...browserIssues);
      
      const isHealthy = errors.length === 0;
      
      console.log(`[Storage Health] Health check complete - Healthy: ${isHealthy}, Errors: ${errors.length}`);
      
      return {
        isHealthy,
        used: stats.used,
        available: stats.available,
        errors,
        quotaWarning
      };
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Storage Health] Health check failed (attempt ${retryCount + 1}):`, error);
      
      // Retry with exponential backoff
      if (retryCount < maxRetries) {
        console.log(`[Storage Health] Retrying health check in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return this.checkStorageHealth(retryCount + 1);
      }
      
      return {
        isHealthy: false,
        used: 0,
        available: 0,
        errors: [`Health check failed after ${maxRetries + 1} attempts: ${errorMsg}`],
        quotaWarning: true
      };
    }
  }

  private async performIsolatedWrite(key: string, data: any): Promise<void> {
    try {
      await idbStorage.set(key, data);
    } catch (error) {
      console.error(`[Storage Health] Isolated write failed:`, error);
      throw new Error(`Write operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async performIsolatedRead(key: string): Promise<any> {
    try {
      return await idbStorage.get(key);
    } catch (error) {
      console.error(`[Storage Health] Isolated read failed:`, error);
      throw new Error(`Read operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async performIsolatedDelete(key: string): Promise<void> {
    try {
      await idbStorage.delete(key);
    } catch (error) {
      console.error(`[Storage Health] Isolated delete failed:`, error);
      // Don't throw here, as cleanup failure shouldn't fail the health check
    }
  }

  private validateTestData(original: any, retrieved: any): boolean {
    if (!retrieved) return false;
    // Relax validation to avoid false positives due to serialization nuances
    try {
      const sameId = original.testId === retrieved.testId;
      const tsA = Number(original.timestamp) || 0;
      const tsB = Number(retrieved.timestamp) || 0;
      const tsClose = Math.abs(tsA - tsB) < 10000; // within 10s window
      return sameId && tsClose;
    } catch {
      return false;
    }
  }

  private async detectConcurrentOperations(): Promise<boolean> {
    try {
      // Check if multiple operations are happening by examining pending transactions
      const activeOperations = await idbStorage.get('__active_operations__') || [];
      return Array.isArray(activeOperations) && activeOperations.length > 1;
    } catch {
      return false;
    }
  }

  private checkBrowserCompatibility(): string[] {
    const issues: string[] = [];
    
    // Check IndexedDB support
    if (!window.indexedDB) {
      issues.push('IndexedDB not supported in this browser');
    }
    
    // Check if in private/incognito mode (limited storage)
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then(estimate => {
        if (estimate.quota && estimate.quota < 50 * 1024 * 1024) { // Less than 50MB
          console.warn('[Storage Health] Limited storage quota detected (possibly private mode)');
        }
      }).catch(() => {
        // Silently handle - not critical
      });
    }
    
    // Check for known problematic browsers
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome') && userAgent.includes('Mobile')) {
      // Mobile Chrome can have storage issues
      console.log('[Storage Health] Mobile Chrome detected - monitoring for storage issues');
    }
    
    return issues;
  }

  // Generic CRUD operations
  async create<T extends { id: string }>(entity: EntityType, data: T): Promise<T> {
    try {
      const existingData = await this.getAll(entity);
      const newData = [...existingData, data];
      
      // Atomic write with verification
      await idbStorage.set(entity, newData);
      const verified = await idbStorage.get(entity);
      
      if (!verified || !verified.find((item: any) => item.id === data.id)) {
        throw new Error('Data verification failed after write');
      }
      
      await this.logOperation('create', entity, data.id, data);
      toast({
        title: 'Saved to IndexedDB',
        description: `${entity.slice(0, -1)} created successfully`,
      });
      
      return data;
    } catch (error) {
      console.error(`[Persistence] Create ${entity} failed:`, error);
      toast({
        title: 'Save Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
      throw error;
    }
  }

  async update<T extends { id: string }>(entity: EntityType, id: string, updates: Partial<T>): Promise<T> {
    try {
      const existingData = await this.getAll(entity);
      const index = existingData.findIndex((item: any) => item.id === id);
      
      if (index === -1) {
        throw new Error(`${entity.slice(0, -1)} with id ${id} not found`);
      }
      
      const updatedItem = Object.assign({}, existingData[index], updates) as T;
      const newData = [...existingData];
      newData[index] = updatedItem;
      
      // Atomic write with verification
      await idbStorage.set(entity, newData);
      const verified = await idbStorage.get(entity);
      
      if (!verified || !verified.find((item: any) => item.id === id)) {
        throw new Error('Data verification failed after update');
      }
      
      await this.logOperation('update', entity, id, updates);
      toast({
        title: 'Updated in IndexedDB',
        description: `${entity.slice(0, -1)} updated successfully`,
      });
      
      return updatedItem;
    } catch (error) {
      console.error(`[Persistence] Update ${entity} failed:`, error);
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
      throw error;
    }
  }

  async delete(entity: EntityType, id: string): Promise<void> {
    try {
      const existingData = await this.getAll(entity);
      const newData = existingData.filter((item: any) => item.id !== id);
      
      // Check for dependencies before deletion
      await this.checkDependencies(entity, id);
      
      // Atomic write with verification
      await idbStorage.set(entity, newData);
      const verified = await idbStorage.get(entity);
      
      if (verified && verified.find((item: any) => item.id === id)) {
        throw new Error('Data verification failed - item still exists after deletion');
      }
      
      await this.logOperation('delete', entity, id);
      toast({
        title: 'Deleted from IndexedDB',
        description: `${entity.slice(0, -1)} deleted successfully`,
      });
    } catch (error) {
      console.error(`[Persistence] Delete ${entity} failed:`, error);
      toast({
        title: 'Delete Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
      throw error;
    }
  }

  async getById<T>(entity: EntityType, id: string): Promise<T | null> {
    try {
      const data = await this.getAll<T>(entity);
      return data.find((item: any) => item.id === id) || null;
    } catch (error) {
      console.error(`[Persistence] Get ${entity} by id failed:`, error);
      return null;
    }
  }

  async getAll<T>(entity: EntityType): Promise<T[]> {
    try {
      const data = await idbStorage.get(entity);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error(`[Persistence] Get all ${entity} failed:`, error);
      return [];
    }
  }

  // Dependency checking
  private async checkDependencies(entity: EntityType, id: string): Promise<void> {
    const dependencies: string[] = [];
    
    if (entity === 'clients') {
      const cases = await this.getAll('cases');
      const clientCases = cases.filter((c: any) => c.clientId === id);
      if (clientCases.length > 0) {
        dependencies.push(`${clientCases.length} cases`);
      }
    }
    
    if (entity === 'courts') {
      const judges = await this.getAll('judges');
      const hearings = await this.getAll('hearings');
      const courtJudges = judges.filter((j: any) => j.courtId === id);
      const courtHearings = hearings.filter((h: any) => h.courtId === id || h.court_id === id);
      
      if (courtJudges.length > 0) dependencies.push(`${courtJudges.length} judges`);
      if (courtHearings.length > 0) dependencies.push(`${courtHearings.length} hearings`);
    }
    
    if (entity === 'cases') {
      const tasks = await this.getAll('tasks');
      const documents = await this.getAll('documents');
      const hearings = await this.getAll('hearings');
      
      const caseTasks = tasks.filter((t: any) => t.caseId === id);
      const caseDocs = documents.filter((d: any) => d.caseId === id);
      const caseHearings = hearings.filter((h: any) => h.caseId === id || h.case_id === id);
      
      if (caseTasks.length > 0) dependencies.push(`${caseTasks.length} tasks`);
      if (caseDocs.length > 0) dependencies.push(`${caseDocs.length} documents`);
      if (caseHearings.length > 0) dependencies.push(`${caseHearings.length} hearings`);
    }
    
    if (dependencies.length > 0) {
      throw new Error(`Cannot delete ${entity.slice(0, -1)} - has dependencies: ${dependencies.join(', ')}`);
    }
  }

  // Operation logging
  private async logOperation(type: EntityOperation['type'], entity: EntityType, id: string, data?: any): Promise<void> {
    const operation: EntityOperation = {
      id: Date.now().toString(),
      type,
      entity,
      data,
      timestamp: new Date().toISOString()
    };
    
    this.operationQueue.push(operation);
    
    // Keep only last 100 operations
    if (this.operationQueue.length > 100) {
      this.operationQueue = this.operationQueue.slice(-100);
    }
    
    // Save operation log
    await idbStorage.set('operation-log', this.operationQueue);
  }

  // Bulk operations
  async bulkCreate<T extends { id: string }>(entity: EntityType, items: T[]): Promise<T[]> {
    try {
      const existingData = await this.getAll(entity);
      const newData = [...existingData, ...items];
      
      await idbStorage.set(entity, newData);
      
      for (const item of items) {
        await this.logOperation('create', entity, item.id, item);
      }
      
      toast({
        title: 'Bulk Import Complete',
        description: `${items.length} ${entity} imported successfully`,
      });
      
      return items;
    } catch (error) {
      console.error(`[Persistence] Bulk create ${entity} failed:`, error);
      throw error;
    }
  }

  // Data export/import
  async exportAllData(): Promise<AppState> {
    try {
      const [cases, clients, courts, judges, employees, hearings, tasks, documents, folders] = await Promise.all([
        this.getAll('cases'),
        this.getAll('clients'),
        this.getAll('courts'),
        this.getAll('judges'),
        this.getAll('employees'),
        this.getAll('hearings'),
        this.getAll('tasks'),
        this.getAll('documents'),
        this.getAll('folders')
      ]);

      return {
        cases: cases as Case[],
        clients: clients as Client[],
        courts: courts as Court[],
        judges: judges as Judge[],
        employees: employees as Employee[],
        hearings: hearings as Hearing[],
        tasks: tasks as Task[],
        documents: documents as Document[],
        folders: folders as Folder[],
        tags: [], // Default empty tags array
        userProfile: {
          id: 'user-1',
          name: 'Default User',
          email: 'user@example.com',
          phone: '',
          role: 'Admin',
          department: 'Legal',
          avatar: '',
          bio: '',
          location: '',
          timezone: 'UTC',
          joinedDate: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          isActive: true
        },
        isLoading: false,
        error: null
      };
    } catch (error) {
      console.error('[Persistence] Export failed:', error);
      throw error;
    }
  }

  async importAllData(data: Partial<AppState>): Promise<void> {
    try {
      const entities: EntityType[] = ['cases', 'clients', 'courts', 'judges', 'employees', 'hearings', 'tasks', 'documents', 'folders'];
      
      for (const entity of entities) {
        if (data[entity] && Array.isArray(data[entity])) {
          await idbStorage.set(entity, data[entity]);
        }
      }
      
      toast({
        title: 'Data Import Complete',
        description: 'All data imported successfully into IndexedDB',
      });
    } catch (error) {
      console.error('[Persistence] Import failed:', error);
      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
      throw error;
    }
  }

  async clearAllData(): Promise<void> {
    try {
      await idbStorage.clear();
      this.operationQueue = [];
      
      toast({
        title: 'Data Cleared',
        description: 'All data cleared from IndexedDB',
      });
    } catch (error) {
      console.error('[Persistence] Clear failed:', error);
      throw error;
    }
  }

  // Get operation history
  async getOperationHistory(): Promise<EntityOperation[]> {
    try {
      const log = await idbStorage.get('operation-log');
      return Array.isArray(log) ? log : [];
    } catch (error) {
      console.error('[Persistence] Get operation history failed:', error);
      return [];
    }
  }

  // Cleanup
  destroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
}

export const persistenceService = new PersistenceService();

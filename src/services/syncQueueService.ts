/**
 * Sync Queue Service
 * Queues pending changes for external synchronization with retry logic
 */

import { db, SyncQueueItem } from '@/data/db';
import { eventBusService } from './eventBusService';

class SyncQueueService {
  private isOnline: boolean = navigator.onLine;
  private processingQueue: boolean = false;
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.setupNetworkListeners();
  }

  /**
   * Setup online/offline event listeners
   */
  private setupNetworkListeners() {
    window.addEventListener('online', () => {
      console.log('🌐 Network: Online');
      this.isOnline = true;
      eventBusService.emit('network:online', {});
      this.processQueue();
    });

    window.addEventListener('offline', () => {
      console.log('🌐 Network: Offline');
      this.isOnline = false;
      eventBusService.emit('network:offline', {});
    });
  }

  /**
   * Add item to sync queue
   */
  async enqueue(
    entityType: string,
    entityId: string,
    operation: 'create' | 'update' | 'delete',
    payload: any,
    priority: 'critical' | 'high' | 'medium' | 'low' = 'medium'
  ): Promise<SyncQueueItem> {
    const now = new Date();
    const item: SyncQueueItem = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      entity_type: entityType,
      entity_id: entityId,
      operation,
      payload,
      priority,
      status: 'pending',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      queued_at: now,
      attempts: 0,
      max_attempts: 5,
    };

    await db.sync_queue.add(item);
    
    console.log(`📤 Enqueued ${operation} for ${entityType}:${entityId} (priority: ${priority})`);
    
    eventBusService.emit('sync:queued', { item });

    // Start processing if online
    if (this.isOnline) {
      this.processQueue();
    }

    return item;
  }

  /**
   * Process the sync queue
   */
  async processQueue(): Promise<void> {
    if (this.processingQueue || !this.isOnline) {
      return;
    }

    this.processingQueue = true;

    try {
      // Get pending items ordered by priority
      const items = await this.getPendingItems();

      for (const item of items) {
        await this.processItem(item);
      }
    } catch (error) {
      console.error('Error processing sync queue:', error);
    } finally {
      this.processingQueue = false;
    }
  }

  /**
   * Get pending items from queue, ordered by priority
   */
  private async getPendingItems(): Promise<SyncQueueItem[]> {
    const now = new Date().toISOString();
    
    const items = await db.sync_queue
      .where('status')
      .equals('pending')
      .toArray();

    // Filter items that are ready (not scheduled for future retry)
    const readyItems = items.filter(
      item => !item.scheduled_for || item.scheduled_for <= now
    );

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return readyItems.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      // If same priority, older items first
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }

  /**
   * Process a single queue item
   */
  private async processItem(item: SyncQueueItem): Promise<void> {
    try {
      console.log(`⚙️ Processing sync item: ${item.entity_type}:${item.entity_id}`);

      // Update status to processing
      await db.sync_queue.update(item.id, {
        status: 'processing',
        updated_at: new Date().toISOString(),
        attempts: item.attempts + 1,
      });

      // Here you would make the actual API call to sync with backend
      // For now, we'll simulate success
      await this.simulateSync(item);

      // Mark as completed
      await db.sync_queue.update(item.id, {
        status: 'completed',
        updated_at: new Date().toISOString(),
      });

      console.log(`✅ Synced ${item.entity_type}:${item.entity_id}`);
      
      eventBusService.emit('sync:completed', { item });

      // Clean up old completed items (keep last 100)
      await this.cleanupCompletedItems();

    } catch (error: any) {
      console.error(`❌ Sync failed for ${item.entity_type}:${item.entity_id}:`, error);
      await this.handleSyncError(item, error);
    }
  }

  /**
   * Simulate sync operation (replace with actual API call)
   */
  private async simulateSync(item: SyncQueueItem): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Simulate 10% failure rate for testing retry logic
    if (Math.random() < 0.1) {
      throw new Error('Simulated sync failure');
    }
  }

  /**
   * Handle sync error with retry logic
   */
  private async handleSyncError(item: SyncQueueItem, error: Error): Promise<void> {
    const maxAttempts = item.max_attempts;
    const attempts = item.attempts + 1;

    if (attempts >= maxAttempts) {
      // Max retries reached, mark as failed
      await db.sync_queue.update(item.id, {
        status: 'failed',
        updated_at: new Date().toISOString(),
        last_error: error.message,
      });

      eventBusService.emit('sync:failed', { item, error });
      
      console.error(`🚫 Max retries reached for ${item.entity_type}:${item.entity_id}`);
    } else {
      // Schedule retry with exponential backoff
      const backoffMs = Math.min(1000 * Math.pow(2, attempts), 60000); // Max 1 minute
      const scheduledFor = new Date(Date.now() + backoffMs).toISOString();

      await db.sync_queue.update(item.id, {
        status: 'pending',
        updated_at: new Date().toISOString(),
        last_error: error.message,
        scheduled_for: scheduledFor,
      });

      console.log(`🔄 Retry scheduled for ${item.entity_type}:${item.entity_id} in ${backoffMs}ms`);

      // Schedule next attempt
      const timeout = setTimeout(() => {
        this.retryTimeouts.delete(item.id);
        this.processQueue();
      }, backoffMs);

      this.retryTimeouts.set(item.id, timeout);
    }
  }

  /**
   * Clean up old completed items
   */
  private async cleanupCompletedItems(): Promise<void> {
    const completedItems = await db.sync_queue
      .where('status')
      .equals('completed')
      .toArray();

    if (completedItems.length > 100) {
      // Sort by completion time and keep only last 100
      const sorted = completedItems.sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      
      const toDelete = sorted.slice(100);
      await db.sync_queue.bulkDelete(toDelete.map(item => item.id));
      
      console.log(`🧹 Cleaned up ${toDelete.length} completed sync items`);
    }
  }

  /**
   * Get queue status
   */
  async getQueueStatus(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    total: number;
  }> {
    const all = await db.sync_queue.toArray();
    
    return {
      pending: all.filter(item => item.status === 'pending').length,
      processing: all.filter(item => item.status === 'processing').length,
      completed: all.filter(item => item.status === 'completed').length,
      failed: all.filter(item => item.status === 'failed').length,
      total: all.length,
    };
  }

  /**
   * Retry failed items
   */
  async retryFailed(): Promise<void> {
    const failedItems = await db.sync_queue
      .where('status')
      .equals('failed')
      .toArray();

    for (const item of failedItems) {
      await db.sync_queue.update(item.id, {
        status: 'pending',
        attempts: 0,
        scheduled_for: undefined,
        last_error: undefined,
      });
    }

    console.log(`🔄 Retrying ${failedItems.length} failed items`);
    this.processQueue();
  }

  /**
   * Clear all completed items
   */
  async clearCompleted(): Promise<void> {
    await db.sync_queue.where('status').equals('completed').delete();
    console.log('🧹 Cleared all completed sync items');
  }

  /**
   * Check if online
   */
  isNetworkOnline(): boolean {
    return this.isOnline;
  }
}

export const syncQueueService = new SyncQueueService();

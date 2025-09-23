/**
 * Base Repository with common CRUD operations and audit logging
 */

import { StoragePort, EntityType } from '../ports/StoragePort';
import { AuditService } from '../services/AuditService';

export abstract class BaseRepository<T extends { id: string }> {
  protected constructor(
    protected storage: StoragePort,
    protected tableName: EntityType,
    protected auditService?: AuditService
  ) {}

  async create(data: T): Promise<T> {
    const created = await this.storage.create(this.tableName, data);
    
    if (this.auditService) {
      await this.auditService.log({
        entity_type: this.tableName,
        entity_id: created.id,
        action: 'create',
        at: new Date(),
        actor_user_id: this.getCurrentUserId(),
        diff_json: { new: created }
      });
    }
    
    return created;
  }

  async update(id: string, updates: Partial<T>): Promise<T> {
    const existing = await this.storage.getById<T>(this.tableName, id);
    if (!existing) {
      throw new Error(`${this.tableName} with id '${id}' not found`);
    }
    
    const updated = await this.storage.update(this.tableName, id, updates);
    
    if (this.auditService) {
      await this.auditService.log({
        entity_type: this.tableName,
        entity_id: id,
        action: 'update',
        at: new Date(),
        actor_user_id: this.getCurrentUserId(),
        diff_json: { 
          old: existing, 
          new: updated, 
          changes: updates 
        }
      });
    }
    
    return updated;
  }

  async delete(id: string): Promise<void> {
    const existing = await this.storage.getById<T>(this.tableName, id);
    if (!existing) {
      throw new Error(`${this.tableName} with id '${id}' not found`);
    }
    
    // Check for dependencies before deletion
    await this.checkDependencies(id);
    
    await this.storage.delete(this.tableName, id);
    
    if (this.auditService) {
      await this.auditService.log({
        entity_type: this.tableName,
        entity_id: id,
        action: 'delete',
        at: new Date(),
        actor_user_id: this.getCurrentUserId(),
        diff_json: { deleted: existing }
      });
    }
  }

  async getById(id: string): Promise<T | null> {
    return await this.storage.getById<T>(this.tableName, id);
  }

  async getAll(): Promise<T[]> {
    return await this.storage.getAll<T>(this.tableName);
  }

  async bulkCreate(items: T[]): Promise<T[]> {
    const created = await this.storage.bulkCreate(this.tableName, items);
    
    if (this.auditService) {
      for (const item of created) {
        await this.auditService.log({
          entity_type: this.tableName,
          entity_id: item.id,
          action: 'create',
          at: new Date(),
          actor_user_id: this.getCurrentUserId(),
          diff_json: { new: item }
        });
      }
    }
    
    return created;
  }

  async query(filter?: (item: T) => boolean): Promise<T[]> {
    return await this.storage.query<T>(this.tableName, filter);
  }

  async queryByField(field: string, value: any): Promise<T[]> {
    return await this.storage.queryByField<T>(this.tableName, field, value);
  }

  async count(): Promise<number> {
    const all = await this.getAll();
    return all.length;
  }

  async exists(id: string): Promise<boolean> {
    const item = await this.getById(id);
    return item !== null;
  }

  // Hook for subclasses to implement dependency checking
  protected async checkDependencies(id: string): Promise<void> {
    // Override in subclasses to implement specific dependency checks
  }

  // Hook for subclasses to implement custom validation
  protected async validate(data: Partial<T>): Promise<void> {
    // Override in subclasses to implement specific validation
  }

  // Get current user ID (placeholder for authentication integration)
  protected getCurrentUserId(): string | undefined {
    // TODO: Integrate with authentication system
    return 'system'; // Default system user for now
  }

  // Transaction support
  async withTransaction<R>(operation: () => Promise<R>): Promise<R> {
    return await this.storage.transaction([this.tableName], operation);
  }

  // Export/Import helpers
  async exportData(): Promise<T[]> {
    return await this.getAll();
  }

  async importData(data: T[]): Promise<void> {
    await this.storage.transaction([this.tableName], async () => {
      await this.storage.clear(this.tableName);
      await this.bulkCreate(data);
    });
  }
}
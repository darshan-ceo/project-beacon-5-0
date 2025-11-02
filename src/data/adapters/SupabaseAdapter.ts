/**
 * SupabaseAdapter - Production PostgreSQL Backend Adapter
 * Implements full StoragePort interface with Supabase SDK
 * Features: Tenant isolation, RLS enforcement, error handling, version control
 */

import { StoragePort, VersionedEntity, EntityType } from '../ports/StoragePort';
import { supabase } from '@/integrations/supabase/client';

export class SupabaseAdapter implements StoragePort {
  private tenantId: string | null = null;
  private userId: string | null = null;
  private initialized = false;
  
  // Cache for tenant isolation
  private queryCache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 60000; // 1 minute

  /**
   * Initialize adapter - fetch and cache tenant ID and user ID
   */
  async initialize(): Promise<void> {
    try {
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ Supabase session error:', sessionError);
        throw new Error('Failed to get session');
      }

      if (!session?.user?.id) {
        console.warn('⚠️ No active session - user must login first');
        this.initialized = true; // Allow initialization but operations will require auth
        return;
      }

      this.userId = session.user.id;

      // Fetch tenant ID from profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', this.userId)
        .single();

      if (profileError || !profile?.tenant_id) {
        console.error('❌ Failed to fetch tenant_id:', profileError);
        throw new Error('User profile not found or tenant_id missing');
      }

      this.tenantId = profile.tenant_id;
      this.initialized = true;

      console.log('✅ SupabaseAdapter initialized', {
        userId: this.userId,
        tenantId: this.tenantId
      });
    } catch (error) {
      console.error('❌ SupabaseAdapter initialization failed:', error);
      throw error;
    }
  }

  /**
   * Ensure user is authenticated and tenant is set
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('SupabaseAdapter not initialized. Call initialize() first.');
    }
    if (!this.tenantId || !this.userId) {
      throw new Error('User not authenticated. Please login.');
    }
  }

  /**
   * Apply tenant filter to query
   */
  private applyTenantFilter(query: any): any {
    this.ensureInitialized();
    return query.eq('tenant_id', this.tenantId);
  }

  /**
   * Handle Supabase errors with friendly messages
   */
  private handleError(error: any, operation: string): never {
    console.error(`Supabase ${operation} error:`, error);

    // Map PostgreSQL error codes to user-friendly messages
    if (error.code === '23505') {
      throw new Error('Record with this ID already exists');
    }
    if (error.code === '23503') {
      throw new Error('Cannot delete - record is referenced by other data');
    }
    if (error.code === '42501') {
      throw new Error('Permission denied - insufficient privileges');
    }
    if (error.message?.includes('JWT')) {
      throw new Error('Session expired - please login again');
    }
    if (error.message?.includes('row-level security')) {
      throw new Error('Access denied by security policy');
    }

    throw new Error(`Database error: ${error.message || 'Unknown error'}`);
  }

  /**
   * Get cache key for query
   */
  private getCacheKey(table: string, filter?: string): string {
    return `${this.tenantId}:${table}:${filter || 'all'}`;
  }

  /**
   * Get cached query result
   */
  private getCached<T>(cacheKey: string): T | null {
    const cached = this.queryCache.get(cacheKey);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.queryCache.delete(cacheKey);
      return null;
    }

    return cached.data;
  }

  /**
   * Set cache entry
   */
  private setCache(cacheKey: string, data: any): void {
    this.queryCache.set(cacheKey, { data, timestamp: Date.now() });
  }

  /**
   * Invalidate cache for table
   */
  private invalidateCache(table: string): void {
    const prefix = `${this.tenantId}:${table}:`;
    for (const key of this.queryCache.keys()) {
      if (key.startsWith(prefix)) {
        this.queryCache.delete(key);
      }
    }
  }

  // ============= CRUD OPERATIONS =============

  async create<T extends { id: string }>(table: string, data: T): Promise<T> {
    this.ensureInitialized();

    try {
      // Add tenant_id if not present
      const dataWithTenant = {
        ...data,
        tenant_id: this.tenantId,
      };

      const { data: result, error } = await (supabase as any)
        .from(table)
        .insert(dataWithTenant)
        .select()
        .single();

      if (error) this.handleError(error, 'create');

      this.invalidateCache(table);
      return result as T;
    } catch (error) {
      console.error(`❌ Create failed for ${table}:`, error);
      throw error;
    }
  }

  async update<T extends { id: string }>(
    table: string,
    id: string,
    updates: Partial<T>
  ): Promise<T> {
    this.ensureInitialized();

    try {
      // Remove tenant_id from updates to prevent tampering
      const { tenant_id, ...safeUpdates } = updates as any;

      const { data: result, error } = await (supabase as any)
        .from(table)
        .update(safeUpdates)
        .eq('id', id)
        .eq('tenant_id', this.tenantId) // Ensure tenant isolation
        .select()
        .single();

      if (error) this.handleError(error, 'update');
      if (!result) throw new Error(`Record not found: ${table}/${id}`);

      this.invalidateCache(table);
      return result as T;
    } catch (error) {
      console.error(`❌ Update failed for ${table}/${id}:`, error);
      throw error;
    }
  }

  async delete(table: string, id: string): Promise<void> {
    this.ensureInitialized();

    try {
      const { error } = await (supabase as any)
        .from(table)
        .delete()
        .eq('id', id)
        .eq('tenant_id', this.tenantId); // Ensure tenant isolation

      if (error) this.handleError(error, 'delete');

      this.invalidateCache(table);
    } catch (error) {
      console.error(`❌ Delete failed for ${table}/${id}:`, error);
      throw error;
    }
  }

  async getById<T>(table: string, id: string): Promise<T | null> {
    this.ensureInitialized();

    try {
      const { data, error } = await (supabase as any)
        .from(table)
        .select('*')
        .eq('id', id)
        .eq('tenant_id', this.tenantId) // Ensure tenant isolation
        .maybeSingle();

      if (error) this.handleError(error, 'getById');

      return data as T | null;
    } catch (error) {
      console.error(`❌ GetById failed for ${table}/${id}:`, error);
      throw error;
    }
  }

  async getAll<T>(table: string): Promise<T[]> {
    this.ensureInitialized();

    try {
      // Check cache first
      const cacheKey = this.getCacheKey(table);
      const cached = this.getCached<T[]>(cacheKey);
      if (cached) return cached;

      const { data, error } = await (supabase as any)
        .from(table)
        .select('*')
        .eq('tenant_id', this.tenantId); // Ensure tenant isolation

      if (error) this.handleError(error, 'getAll');

      const result = data as T[] || [];
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error(`❌ GetAll failed for ${table}:`, error);
      throw error;
    }
  }

  // ============= BULK OPERATIONS =============

  async bulkCreate<T extends { id: string }>(table: string, items: T[]): Promise<T[]> {
    this.ensureInitialized();

    try {
      // Add tenant_id to all items
      const itemsWithTenant = items.map(item => ({
        ...item,
        tenant_id: this.tenantId,
      }));

      const { data, error } = await (supabase as any)
        .from(table)
        .insert(itemsWithTenant)
        .select();

      if (error) this.handleError(error, 'bulkCreate');

      this.invalidateCache(table);
      return data as T[];
    } catch (error) {
      console.error(`❌ BulkCreate failed for ${table}:`, error);
      throw error;
    }
  }

  async bulkUpdate<T extends { id: string }>(
    table: string,
    updates: Array<{ id: string; data: Partial<T> }>
  ): Promise<T[]> {
    this.ensureInitialized();

    try {
      // Perform updates sequentially (Supabase doesn't support bulk update natively)
      const results: T[] = [];
      
      for (const update of updates) {
        const result = await this.update<T>(table, update.id, update.data);
        results.push(result);
      }

      this.invalidateCache(table);
      return results;
    } catch (error) {
      console.error(`❌ BulkUpdate failed for ${table}:`, error);
      throw error;
    }
  }

  async bulkDelete(table: string, ids: string[]): Promise<void> {
    this.ensureInitialized();

    try {
      const { error } = await (supabase as any)
        .from(table)
        .delete()
        .in('id', ids)
        .eq('tenant_id', this.tenantId); // Ensure tenant isolation

      if (error) this.handleError(error, 'bulkDelete');

      this.invalidateCache(table);
    } catch (error) {
      console.error(`❌ BulkDelete failed for ${table}:`, error);
      throw error;
    }
  }

  // ============= QUERY OPERATIONS =============

  async query<T>(table: string, filter?: (item: T) => boolean): Promise<T[]> {
    // Get all records and apply client-side filter
    const allRecords = await this.getAll<T>(table);
    
    if (!filter) return allRecords;
    
    return allRecords.filter(filter);
  }

  async queryByField<T>(table: string, field: string, value: any): Promise<T[]> {
    this.ensureInitialized();

    try {
      const { data, error } = await (supabase as any)
        .from(table)
        .select('*')
        .eq('tenant_id', this.tenantId) // Ensure tenant isolation
        .eq(field, value);

      if (error) this.handleError(error, 'queryByField');

      return data as T[] || [];
    } catch (error) {
      console.error(`❌ QueryByField failed for ${table}.${field}:`, error);
      throw error;
    }
  }

  // ============= TRANSACTION SUPPORT =============

  async transaction<T>(tables: string[], operation: () => Promise<T>): Promise<T> {
    // Supabase doesn't have explicit transaction API in client SDK
    // Operations are atomic by default for single queries
    // For multi-step transactions, we rely on RLS and retry logic
    
    try {
      const result = await operation();
      
      // Invalidate cache for all affected tables
      tables.forEach(table => this.invalidateCache(table));
      
      return result;
    } catch (error) {
      console.error('❌ Transaction failed:', error);
      throw error;
    }
  }

  // ============= STORAGE MANAGEMENT =============

  async clear(table: string): Promise<void> {
    this.ensureInitialized();

    try {
      // Delete all records for this tenant
      const { error } = await (supabase as any)
        .from(table)
        .delete()
        .eq('tenant_id', this.tenantId);

      if (error) this.handleError(error, 'clear');

      this.invalidateCache(table);
      console.log(`🧹 Cleared all records from ${table} for tenant ${this.tenantId}`);
    } catch (error) {
      console.error(`❌ Clear failed for ${table}:`, error);
      throw error;
    }
  }

  async clearAll(): Promise<void> {
    console.warn('⚠️ clearAll() not implemented for SupabaseAdapter - too dangerous');
    throw new Error('clearAll() is not supported for Supabase backend (safety measure)');
  }

  async exportAll(): Promise<Record<string, any[]>> {
    this.ensureInitialized();

    const tables: EntityType[] = [
      'clients', 'cases', 'tasks', 'hearings', 'documents',
      'employees', 'courts', 'judges', 'folders'
    ];

    const exportData: Record<string, any[]> = {};

    for (const table of tables) {
      try {
        const data = await this.getAll(table);
        exportData[table] = data;
        console.log(`✅ Exported ${data.length} records from ${table}`);
      } catch (error) {
        console.error(`❌ Export failed for ${table}:`, error);
        exportData[table] = [];
      }
    }

    return exportData;
  }

  async importAll(data: Record<string, any[]>): Promise<void> {
    this.ensureInitialized();

    for (const [table, records] of Object.entries(data)) {
      if (records.length === 0) continue;

      try {
        await this.bulkCreate(table, records);
        console.log(`✅ Imported ${records.length} records to ${table}`);
      } catch (error) {
        console.error(`❌ Import failed for ${table}:`, error);
        throw error;
      }
    }
  }

  // ============= HEALTH & DIAGNOSTICS =============

  async healthCheck(): Promise<{ healthy: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Check 1: Session validity
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        errors.push('No active session');
      }

      // Check 2: Database connectivity
      const { error: dbError } = await supabase
        .from('tenants')
        .select('id')
        .limit(1);
      
      if (dbError) {
        errors.push(`Database connectivity: ${dbError.message}`);
      }

      // Check 3: Tenant access
      if (this.tenantId) {
        const { data: tenant, error: tenantError } = await supabase
          .from('tenants')
          .select('id, is_active')
          .eq('id', this.tenantId)
          .single();

        if (tenantError || !tenant) {
          errors.push('Tenant not found');
        } else if (!tenant.is_active) {
          errors.push('Tenant is inactive');
        }
      }

      return {
        healthy: errors.length === 0,
        errors
      };
    } catch (error) {
      errors.push(`Health check failed: ${error}`);
      return { healthy: false, errors };
    }
  }

  async getStorageInfo(): Promise<{ used: number; available: number; quota: number }> {
    this.ensureInitialized();

    try {
      // Query tenant storage limits
      const { data: tenant, error } = await supabase
        .from('tenants')
        .select('max_storage_gb')
        .eq('id', this.tenantId)
        .single();

      if (error) this.handleError(error, 'getStorageInfo');

      const quotaBytes = (tenant?.max_storage_gb || 10) * 1024 * 1024 * 1024; // GB to bytes

      // Calculate used storage from documents table
      const { data: documents } = await supabase
        .from('documents')
        .select('file_size')
        .eq('tenant_id', this.tenantId);

      const usedBytes = documents?.reduce((sum, doc) => sum + (doc.file_size || 0), 0) || 0;
      const availableBytes = quotaBytes - usedBytes;

      return {
        used: usedBytes,
        available: availableBytes > 0 ? availableBytes : 0,
        quota: quotaBytes
      };
    } catch (error) {
      console.error('❌ getStorageInfo failed:', error);
      return { used: 0, available: 0, quota: 0 };
    }
  }

  // ============= VERSION CONTROL =============

  async getVersion(table: string, id: string): Promise<number> {
    const record = await this.getById<VersionedEntity>(table, id);
    return record?.version || 1;
  }

  compareVersions(v1: number, v2: number): 'equal' | 'before' | 'after' {
    if (v1 === v2) return 'equal';
    return v1 < v2 ? 'before' : 'after';
  }

  bumpVersion<T extends VersionedEntity>(entity: T, userId?: string): T {
    return {
      ...entity,
      version: (entity.version || 0) + 1,
      last_modified_at: new Date().toISOString(),
      last_modified_by: userId || this.userId || undefined,
      sync_status: 'pending' as const,
    };
  }

  // ============= LIFECYCLE =============

  async destroy(): Promise<void> {
    this.queryCache.clear();
    this.tenantId = null;
    this.userId = null;
    this.initialized = false;
    console.log('🔌 SupabaseAdapter destroyed');
  }
}

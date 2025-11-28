/**
 * SupabaseAdapter - Production PostgreSQL Backend Adapter
 * Implements full StoragePort interface with Supabase SDK
 * Features: Tenant isolation, RLS enforcement, error handling, version control
 */

import { StoragePort, VersionedEntity, EntityType } from '../ports/StoragePort';
import { supabase } from '@/integrations/supabase/client';
import { isValidUUID } from '@/utils/uuidValidator';

export class SupabaseAdapter implements StoragePort {
  private tenantId: string | null = null;
  private userId: string | null = null;
  private initialized = false;
  private authSubscription: any = null;
  private initializationPromise: Promise<void> | null = null;
  
  // Cache for tenant isolation
  private queryCache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 60000; // 1 minute
  
  // Table name mapping: EntityType -> Actual Supabase table name
  private readonly tableNameMapping: Record<string, string> = {
    'folders': 'document_folders',
    'audit_logs': 'audit_log',
    // Task automation tables are correctly named, no mapping needed
    // but listed here for documentation purposes
  };

  /**
   * Get actual table name from entity type
   * Maps logical entity names to physical table names in Supabase
   */
  private getActualTableName(entityType: string): string {
    const mapped = this.tableNameMapping[entityType];
    if (mapped) {
      console.log(`📝 Mapping ${entityType} → ${mapped}`);
    }
    return mapped || entityType;
  }

  /**
   * Initialize adapter - fetch tenant ID from authenticated user's profile
   * Now with retry logic and auth state listening
   */
  async initialize(): Promise<void> {
    // If already initializing, return the existing promise
    if (this.initializationPromise) {
      console.log('⏳ Initialization already in progress, waiting...');
      return this.initializationPromise;
    }

    // If already initialized, just return
    if (this.initialized && this.tenantId && this.userId) {
      console.log('✅ SupabaseAdapter already initialized');
      return;
    }

    // Create initialization promise
    this.initializationPromise = this.performInitialization();
    
    try {
      await this.initializationPromise;
    } finally {
      this.initializationPromise = null;
    }
  }

  /**
   * Perform the actual initialization with retry logic
   */
  private async performInitialization(retryCount = 0): Promise<void> {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 second

    try {
      console.log(`🔄 Initializing SupabaseAdapter (attempt ${retryCount + 1}/${MAX_RETRIES + 1})...`);

      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('❌ Session error:', sessionError);
        throw new Error(`Failed to get session: ${sessionError.message}`);
      }

      if (!session?.user?.id) {
        // No session yet - set up auth state listener and wait
        if (retryCount < MAX_RETRIES) {
          console.warn(`⚠️ No active session yet, retrying in ${RETRY_DELAY}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          return this.performInitialization(retryCount + 1);
        } else {
          console.warn('⚠️ No active session after retries - user must login');
          this.setupAuthListener(); // Set up listener for future auth
          throw new Error('User not authenticated. Please login.');
        }
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
        
        // Retry on profile fetch failure
        if (retryCount < MAX_RETRIES) {
          console.warn(`⚠️ Profile fetch failed, retrying in ${RETRY_DELAY}ms...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          return this.performInitialization(retryCount + 1);
        }
        
        throw new Error('User profile not found or tenant_id missing');
      }

      this.tenantId = profile.tenant_id;
      this.initialized = true;

      console.log('✅ SupabaseAdapter initialized successfully', {
        userId: this.userId,
        tenantId: this.tenantId
      });

      // Set up auth state listener for session changes
      this.setupAuthListener();

    } catch (error) {
      console.error(`❌ SupabaseAdapter initialization failed (attempt ${retryCount + 1}):`, error);
      
      // If we haven't exhausted retries, try again
      if (retryCount < MAX_RETRIES) {
        console.log(`🔄 Retrying initialization in ${RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return this.performInitialization(retryCount + 1);
      }
      
      // Set up listener even on failure so we can reinitialize on auth
      this.setupAuthListener();
      throw error;
    }
  }

  /**
   * Set up auth state listener to handle session changes
   */
  private setupAuthListener(): void {
    // Only set up once
    if (this.authSubscription) {
      return;
    }

    console.log('👂 Setting up auth state listener...');

    this.authSubscription = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`🔐 Auth state changed: ${event}`, {
        hasSession: !!session,
        userId: session?.user?.id
      });

      if (event === 'SIGNED_IN' && session?.user?.id) {
        // User just signed in - reinitialize
        console.log('✅ User signed in, reinitializing adapter...');
        this.initialized = false;
        this.userId = null;
        this.tenantId = null;
        
        // Use setTimeout to avoid blocking the auth callback
        setTimeout(async () => {
          try {
            await this.initialize();
          } catch (error) {
            console.error('❌ Failed to reinitialize after sign in:', error);
          }
        }, 0);
      } else if (event === 'SIGNED_OUT') {
        // User signed out - clear state
        console.log('🚪 User signed out, clearing adapter state');
        this.initialized = false;
        this.userId = null;
        this.tenantId = null;
        this.invalidateAllCache();
      } else if (event === 'TOKEN_REFRESHED' && session?.user?.id) {
        // Token refreshed - ensure we're still initialized
        if (!this.initialized || !this.tenantId) {
          console.log('🔄 Token refreshed but not initialized, reinitializing...');
          setTimeout(async () => {
            try {
              await this.initialize();
            } catch (error) {
              console.error('❌ Failed to reinitialize after token refresh:', error);
            }
          }, 0);
        }
      }
    });

    console.log('✅ Auth state listener set up');
  }

  /**
   * Ensure user is authenticated and tenant is set
   * Now with auto-retry on initialization failure
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized || !this.tenantId || !this.userId) {
      console.warn('⚠️ Adapter not initialized, attempting initialization...');
      
      try {
        await this.initialize();
      } catch (error) {
        throw new Error('User not authenticated. Please login.');
      }
    }
    
    if (!this.tenantId || !this.userId) {
      throw new Error('User not authenticated. Please login.');
    }
  }

  /**
   * Apply tenant filter to query
   */
  private async applyTenantFilter(query: any): Promise<any> {
    await this.ensureInitialized();
    return query.eq('tenant_id', this.tenantId);
  }

  /**
   * Handle Supabase errors with friendly messages
   */
  private handleError(error: any, operation: string): never {
    console.error(`Supabase ${operation} error:`, error);

    // Map PostgreSQL error codes to user-friendly messages
    if (error.code === '42P01') {
      throw new Error(`Table not found. This feature may not be fully implemented yet. (Error: ${error.message})`);
    }
    if (error.code === '23505') {
      throw new Error('Record with this ID already exists');
    }
    if (error.code === '23503') {
      throw new Error('Foreign key constraint violation');
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
    await this.ensureInitialized();

    try {
      // UUID validation helper
      const isUUID = (v: any) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
      const asUUIDOrNull = (v: any) => (isUUID(v) ? v : null);

      let processedData = { ...data };

      // Defensive UUID sanitization for tasks table
      if (table === 'tasks') {
        const taskData = data as any;
        
        // If id is empty or invalid, remove it so DB generates UUID
        if (!taskData.id || !isUUID(taskData.id)) {
          const { id, ...dataWithoutId } = taskData;
          processedData = dataWithoutId as any;
        }
        
        // Sanitize all UUID foreign keys
        processedData = {
          ...processedData,
          case_id: asUUIDOrNull((taskData as any).case_id),
          client_id: asUUIDOrNull((taskData as any).client_id),
          assigned_to: asUUIDOrNull((taskData as any).assigned_to),
          assigned_by: asUUIDOrNull((taskData as any).assigned_by),
          hearing_id: asUUIDOrNull((taskData as any).hearing_id),
        };

        console.log('[Tasks:create] Sanitized payload:', {
          title: (taskData as any).title,
          case_id: (processedData as any).case_id,
          case_number: (taskData as any).case_number,
          client_id: (processedData as any).client_id,
          assigned_to: (processedData as any).assigned_to,
          assigned_by: (processedData as any).assigned_by,
        });
      }

      // Normalize: strip UI-only fields and convert camelCase to snake_case
      const normalized = this.normalizeForBackend(table, [processedData])[0];

      // Add tenant_id if not present
      const dataWithTenant = {
        ...normalized,
        tenant_id: this.tenantId,
      };

      // Insert normally when no id is provided; if id exists, upsert defensively to avoid duplicate key errors
      let result: any;
      let error: any;
      if ((dataWithTenant as any).id) {
        const { data, error: upsertError } = await (supabase as any)
          .from(this.getActualTableName(table))
          .upsert(dataWithTenant, { onConflict: 'id', ignoreDuplicates: false })
          .select()
          .single();
        result = data; error = upsertError;
      } else {
        const { data, error: insertError } = await (supabase as any)
          .from(this.getActualTableName(table))
          .insert(dataWithTenant)
          .select()
          .single();
        result = data; error = insertError;
      }

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
    await this.ensureInitialized();

    try {
      // Normalize: strip UI-only fields and convert camelCase to snake_case
      const normalized = this.normalizeForBackend(table, [updates as any])[0];
      
      // Remove tenant_id from updates to prevent tampering
      const { tenant_id, ...safeUpdates } = normalized as any;

      const { data: result, error } = await (supabase as any)
        .from(this.getActualTableName(table))
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
    await this.ensureInitialized();

    try {
      const { error } = await (supabase as any)
        .from(this.getActualTableName(table))
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
    await this.ensureInitialized();

    try {
      const { data, error } = await (supabase as any)
        .from(this.getActualTableName(table))
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
    await this.ensureInitialized();

    try {
      // Check cache first
      const cacheKey = this.getCacheKey(table);
      const cached = this.getCached<T[]>(cacheKey);
      if (cached) return cached;

      const { data, error } = await (supabase as any)
        .from(this.getActualTableName(table))
        .select('*')
        .eq('tenant_id', this.tenantId); // Ensure tenant isolation

      if (error) this.handleError(error, 'getAll');

      let result = data as T[] || [];
      
      // Transform field names for specific tables to match frontend expectations
      if (table === 'cases') {
        result = result.map(item => this.transformCaseFields(item)) as T[];
      } else if (table === 'tasks') {
        result = result.map(item => this.transformTaskFields(item)) as T[];
      } else if (table === 'clients') {
        result = result.map(item => this.transformClientFields(item)) as T[];
      } else if (table === 'automation_rules') {
        result = result.map(item => this.transformAutomationRuleFields(item)) as T[];
      } else if (table === 'timeline_entries') {
        result = result.map(item => this.transformTimelineFields(item)) as T[];
      }
      
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error(`❌ GetAll failed for ${table}:`, error);
      throw error;
    }
  }

  // ============= BULK OPERATIONS =============

  async bulkCreate<T extends { id: string }>(table: string, items: T[]): Promise<T[]> {
    await this.ensureInitialized();

    try {
      // Normalize payload before insert
      const normalizedItems = this.normalizeForBackend(table, items);
      
      // Add tenant_id to all items
      const itemsWithTenant = normalizedItems.map(item => ({
        ...item,
        tenant_id: this.tenantId,
      }));

      // Use upsert to avoid duplicate key errors
      const { data, error } = await (supabase as any)
        .from(this.getActualTableName(table))
        .upsert(itemsWithTenant, { onConflict: 'id', ignoreDuplicates: false })
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
    await this.ensureInitialized();

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
    await this.ensureInitialized();

    try {
      const { error } = await (supabase as any)
        .from(this.getActualTableName(table))
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
    await this.ensureInitialized();

    try {
      const { data, error } = await (supabase as any)
        .from(this.getActualTableName(table))
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
    await this.ensureInitialized();

    try {
      // Delete all records for this tenant
      const { error } = await (supabase as any)
        .from(this.getActualTableName(table))
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
    await this.ensureInitialized();

    const tables: EntityType[] = [
      'clients', 'cases', 'tasks', 'hearings', 'documents',
      'employees', 'courts', 'judges', 'document_folders'
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
    await this.ensureInitialized();

    console.log('📦 Starting data import with UUID conversion and FK resolution...');
    
    // Import migration helpers dynamically
    const { convertIdsToUUIDs, applyForeignKeyMapping, getTableProcessingOrder, isValidUUID } = await import('@/utils/migrationHelpers');
    
    // Step 1: Convert all numeric IDs to UUIDs and build mapping
    const { convertedData, idMapping } = convertIdsToUUIDs(data);
    
    // Step 2: Helpers + Build lookup maps for FK resolution
    const norm = (v: any) => (v === undefined || v === null) ? '' : String(v).toLowerCase().trim();

    const normalizeKeysForImport = (tbl: string, rec: any) => {
      const r: any = { ...rec };
      switch (tbl) {
        case 'tasks':
          // Core FK mappings
          if (r.assignedTo && !r.assigned_to) r.assigned_to = r.assignedTo;
          if (r.assignedToId && !r.assigned_to) r.assigned_to = r.assignedToId;
          if (r.assignedBy && !r.assigned_by) r.assigned_by = r.assignedBy;
          if (r.assignedById && !r.assigned_by) r.assigned_by = r.assignedById;
          if (r.caseId && !r.case_id) r.case_id = r.caseId;
          if (r.clientId && !r.client_id) r.client_id = r.clientId;
          if (r.hearingId && !r.hearing_id) r.hearing_id = r.hearingId;
          
          // Additional field mappings
          if (r.caseNumber && !r.case_number) r.case_number = r.caseNumber;
          if (r.estimatedHours !== undefined && r.estimated_hours === undefined) r.estimated_hours = r.estimatedHours;
          if (r.actualHours !== undefined && r.actual_hours === undefined) r.actual_hours = r.actualHours;
          if (r.isAutoGenerated !== undefined && r.is_auto_generated === undefined) r.is_auto_generated = r.isAutoGenerated;
          if (r.escalationLevel !== undefined && r.escalation_level === undefined) r.escalation_level = r.escalationLevel;
          if (r.dueDateValidated !== undefined && r.due_date_validated === undefined) r.due_date_validated = r.dueDateValidated;
          
          if (r.createdBy && !r.created_by) r.created_by = r.createdBy;
          if (r.completedBy && !r.completed_by) r.completed_by = r.completedBy;
          break;
        case 'cases':
          if (r.clientId && !r.client_id) r.client_id = r.clientId;
          if (r.assignedTo && !r.assigned_to) r.assigned_to = r.assignedTo;
          if (r.ownerId && !r.owner_id) r.owner_id = r.ownerId;
          if (r.forumId && !r.forum_id) r.forum_id = r.forumId;
          if (r.authorityId && !r.authority_id) r.authority_id = r.authorityId;
          break;
        case 'clients':
          if (r.clientGroupId && !r.client_group_id) r.client_group_id = r.clientGroupId;
          if (r.assignedCAId && !r.owner_id) r.owner_id = r.assignedCAId;
          if (r.ownerId && !r.owner_id) r.owner_id = r.ownerId;
          break;
        case 'hearings':
          if (r.caseId && !r.case_id) r.case_id = r.caseId;
          if (r.courtId && !r.court_id) r.court_id = r.courtId;
          if (r.forumId && !r.forum_id) r.forum_id = r.forumId;
          if (r.authorityId && !r.authority_id) r.authority_id = r.authorityId;
          break;
        case 'documents':
          if (r.caseId && !r.case_id) r.case_id = r.caseId;
          if (r.clientId && !r.client_id) r.client_id = r.clientId;
          if (r.taskId && !r.task_id) r.task_id = r.taskId;
          if (r.hearingId && !r.hearing_id) r.hearing_id = r.hearingId;
          if (r.uploadedBy && !r.uploaded_by) r.uploaded_by = r.uploadedBy;
          if (r.folderId && !r.folder_id) r.folder_id = r.folderId;
          break;
        case 'employees':
          if (r.managerId && !r.manager_id) r.manager_id = r.managerId;
          if (r.reportingTo && !r.reporting_to) r.reporting_to = r.reportingTo;
          if (r.createdBy && !r.created_by) r.created_by = r.createdBy;
          if (r.updatedBy && !r.updated_by) r.updated_by = r.updatedBy;
          break;
        case 'judges':
          if (r.courtId && !r.court_id) r.court_id = r.courtId;
          if (r.createdBy && !r.created_by) r.created_by = r.createdBy;
          if (r.updatedBy && !r.updated_by) r.updated_by = r.updatedBy;
          
          // Validate UUID foreign keys
          if (r.created_by && !isValidUUID(r.created_by)) {
            console.warn(`[SupabaseAdapter] Invalid created_by UUID: ${r.created_by}, setting to null`);
            r.created_by = null;
          }
          if (r.updated_by && !isValidUUID(r.updated_by)) {
            console.warn(`[SupabaseAdapter] Invalid updated_by UUID: ${r.updated_by}, setting to null`);
            r.updated_by = null;
          }
          if (r.court_id && !isValidUUID(r.court_id)) {
            throw new Error('Invalid court ID - please select a valid court');
          }
          
          // Keep only valid database columns for judges
          const validJudgeFields = [
            'id', 'tenant_id', 'name', 'designation', 'status', 'court_id',
            'bench', 'jurisdiction', 'city', 'state', 'email', 'phone',
            'appointment_date', 'retirement_date', 'years_of_service',
            'specialization', 'chambers', 'assistant', 'availability',
            'tags', 'notes', 'photo_url', 'created_at', 'updated_at', 'created_by'
          ];
          Object.keys(r).forEach(key => {
            if (!validJudgeFields.includes(key)) delete r[key];
          });
          break;
        case 'document_folders':
          if (r.caseId && !r.case_id) r.case_id = r.caseId;
          if (r.parentId && !r.parent_id) r.parent_id = r.parentId;
          if (r.createdBy && !r.created_by) r.created_by = r.createdBy;
          break;
      }
      return r;
    };

    // Build lookup maps
    const employeesNameLookup = new Map<string, string>();
    const employeesEmailLookup = new Map<string, string>();
    const caseNumberLookup = new Map<string, string>();
    const caseTitleLookup = new Map<string, string>();
    const clientNameLookup = new Map<string, string>();
    
    if (convertedData.employees) {
      convertedData.employees.forEach((emp: any) => {
        const empId = emp.id;
        const name = emp.full_name || emp.fullName || emp.name;
        if (name) employeesNameLookup.set(norm(name), empId);
        const emails = [emp.email, emp.official_email, emp.personal_email].filter(Boolean);
        emails.forEach((e: string) => employeesEmailLookup.set(norm(e), empId));
      });
    }
    
    if (convertedData.cases) {
      convertedData.cases.forEach((c: any) => {
        const num = c.case_number || c.caseNumber;
        if (num) caseNumberLookup.set(norm(num), c.id);
        if (c.title) caseTitleLookup.set(norm(c.title), c.id);
      });
    }
    
    if (convertedData.clients) {
      convertedData.clients.forEach((client: any) => {
        const n = client.display_name || client.name;
        if (n) clientNameLookup.set(norm(n), client.id);
      });
    }

    // Dependency tracking
    const failedTables = new Set<string>();
    const dependencyMap: Record<string, string[]> = {
      clients: ['cases', 'documents'],
      cases: ['hearings', 'documents', 'task_followups', 'task_notes'],
      courts: ['judges'],
    };
    const tableOrder = getTableProcessingOrder();
    const errors: string[] = [];
    const droppedCounts: Record<string, number> = {};
    
    for (const table of tableOrder) {
      let records = convertedData[table];
      if (!records || records.length === 0) continue;

      try {
        // Apply foreign key mapping for this table
        records = applyForeignKeyMapping(table, records, idMapping);
        
        // Resolve non-UUID FKs using lookup maps
        const validRecords: any[] = [];
        
        for (const record of records) {
          let shouldInclude = true;

          // created_by fallback for specific tables
          const createdByTables = new Set(['employees', 'judges', 'courts', 'automation_rules', 'task_followups', 'task_bundles']);
          if (createdByTables.has(table)) {
            if (!record.created_by || !isValidUUID(String(record.created_by))) {
              record.created_by = this.userId;
            }
          }
          
          // Employees: sanitize nullable FKs
          if (table === 'employees') {
            if (record.manager_id && !isValidUUID(String(record.manager_id))) delete record.manager_id;
            if (record.reporting_to && !isValidUUID(String(record.reporting_to))) delete record.reporting_to;
          }

          // Clients: sanitize nullable FKs
          if (table === 'clients') {
            if (record.owner_id && !isValidUUID(String(record.owner_id))) delete record.owner_id;
            if (record.client_group_id && !isValidUUID(String(record.client_group_id))) delete record.client_group_id;
          }

          // Judges: require valid court_id
          if (table === 'judges') {
            if (!record.court_id || !isValidUUID(String(record.court_id))) {
              shouldInclude = false;
            }
          }
          
          // Tasks: resolve assigned_to if not UUID
          if (table === 'tasks' && record.assigned_to && !isValidUUID(String(record.assigned_to))) {
            const key = norm(record.assigned_to);
            const resolved = employeesNameLookup.get(key) || employeesEmailLookup.get(key);
            if (resolved) {
              record.assigned_to = resolved;
            } else {
              delete record.assigned_to; // Nullable, delete if unresolvable
            }
          }
          
          // Hearings: resolve case_id if not UUID (required)
          if (table === 'hearings') {
            if (record.case_id && !isValidUUID(String(record.case_id))) {
              const key = norm(record.case_id);
              const resolved = caseNumberLookup.get(key) || caseTitleLookup.get(key);
              if (resolved) {
                record.case_id = resolved;
              } else {
                shouldInclude = false; // Drop hearing if case_id unresolvable
              }
            }
            if (!record.case_id || !isValidUUID(String(record.case_id))) {
              shouldInclude = false;
            }
          }
          
          // Cases: resolve client_id if not UUID (required)
          if (table === 'cases') {
            if (record.client_id && !isValidUUID(String(record.client_id))) {
              const key = norm(record.client_id);
              const resolved = clientNameLookup.get(key);
              if (resolved) {
                record.client_id = resolved;
              } else {
                shouldInclude = false;
              }
            }
            if (!record.client_id || !record.case_number || !record.title) {
              shouldInclude = false;
            }
          }
          
          // Documents: resolve FKs and set uploaded_by fallback
          if (table === 'documents') {
            // Resolve case_id/client_id
            if (record.case_id && !isValidUUID(String(record.case_id))) {
              const key = norm(record.case_id);
              const resolved = caseNumberLookup.get(key) || caseTitleLookup.get(key);
              if (resolved) record.case_id = resolved; else delete record.case_id; // Nullable
            }
            if (record.client_id && !isValidUUID(String(record.client_id))) {
              const key = norm(record.client_id);
              const resolved = clientNameLookup.get(key);
              if (resolved) record.client_id = resolved; else delete record.client_id; // Nullable
            }
            // Delete unresolvable nullable FKs
            if (record.task_id && !isValidUUID(String(record.task_id))) delete record.task_id;
            if (record.hearing_id && !isValidUUID(String(record.hearing_id))) delete record.hearing_id;
            
            // Set uploaded_by to current user if missing/invalid
            if (!record.uploaded_by || !isValidUUID(String(record.uploaded_by))) {
              record.uploaded_by = this.userId;
            }
            
            // Validate required fields
            if (!record.file_name || !record.file_path || !record.file_type || !record.uploaded_by) {
              shouldInclude = false;
            }
          }
          
          if (shouldInclude) {
            validRecords.push(record);
          }
        }
        
        const droppedCount = records.length - validRecords.length;
        if (droppedCount > 0) {
          droppedCounts[table] = droppedCount;
          console.warn(`⚠️ Dropped ${droppedCount} invalid records from ${table}`);
        }
        
        if (validRecords.length > 0) {
          await this.bulkCreate(table, validRecords);
          console.log(`✅ Imported ${validRecords.length} records to ${table}`);
        }
      } catch (error) {
        const errorMsg = `Import failed for ${table}: ${error}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
        failedTables.add(table);
        // Continue with other tables
      }
    }
    
    if (Object.keys(droppedCounts).length > 0) {
      console.log('📊 Dropped records summary:', droppedCounts);
    }
    
    if (errors.length > 0) {
      console.error('⚠️ Import completed with errors:', errors);
      throw new Error(`Import failed for ${errors.length} table(s): ${errors.join('; ')}`);
    }
    
    console.log('✅ Data import completed successfully');
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
    await this.ensureInitialized();

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

  /**
   * Normalize data payloads to match backend schema
   * Strips invalid columns and maps field names
   * Validates and sanitizes UUID foreign keys
   */
  private normalizeForBackend<T>(table: string, items: T[]): T[] {
    const actualTable = this.getActualTableName(table);
    
    
    return items.map(item => {
      const normalized: any = { ...item };
      
      switch (actualTable) {
        case 'clients':
          // Map UI fields to DB columns
          if (normalized.name && !normalized.display_name) {
            normalized.display_name = normalized.name;
          }
          if (normalized.clientGroupId && !normalized.client_group_id) {
            normalized.client_group_id = normalized.clientGroupId;
          }
          if (normalized.assignedCAId && !normalized.owner_id) {
            normalized.owner_id = normalized.assignedCAId;
          }
          if (normalized.createdAt && !normalized.created_at) {
            normalized.created_at = normalized.createdAt;
          }
          if (normalized.updatedAt && !normalized.updated_at) {
            normalized.updated_at = normalized.updatedAt;
          }
          // Normalize status to lowercase
          if (normalized.status === 'Active') normalized.status = 'active';
          if (normalized.status === 'Inactive') normalized.status = 'inactive';
          
          // Delete camelCase versions
          delete normalized.name;
          delete normalized.clientGroupId;
          delete normalized.assignedCAId;
          delete normalized.createdAt;
          delete normalized.updatedAt;
          
          // Delete UI-only/computed fields
          delete normalized.activeCases;
          delete normalized.totalCases;
          delete normalized.totalInvoiced;
          delete normalized.portalAccess;
          delete normalized.category;
          delete normalized.registrationNo;
          delete normalized.registrationNumber;
          delete normalized.panNumber;
          delete normalized.gstNumber;
          delete normalized.registrationDate;
          delete normalized.assignedCAName;
          delete normalized.needsAddressReview;
          delete normalized.needsSignatoryReview;
          
          // Validate optional UUID FKs
          if (normalized.client_group_id && !isValidUUID(normalized.client_group_id)) {
            console.warn(`⚠️ Invalid client_group_id: ${normalized.client_group_id} - setting to null`);
            normalized.client_group_id = null;
          }
          if (normalized.owner_id && !isValidUUID(normalized.owner_id)) {
            normalized.owner_id = null;
          }
          
          // Keep only valid DB columns (now including jurisdiction)
          const validClientFields = ['id', 'tenant_id', 'display_name', 'email', 'phone', 'pan', 'gstin', 'state', 'city', 'status', 'client_group_id', 'owner_id', 'created_at', 'updated_at', 'address', 'signatories', 'type', 'jurisdiction'];
          Object.keys(normalized).forEach(key => {
            if (!validClientFields.includes(key)) delete normalized[key];
          });
          break;
          
        case 'automation_rules':
          // Map nested trigger to flat columns
          if (normalized.trigger?.event && !normalized.trigger_type) {
            normalized.trigger_type = normalized.trigger.event;
          }
          if (normalized.trigger?.conditions && !normalized.trigger_config) {
            normalized.trigger_config = normalized.trigger.conditions;
          }
          // Map booleans and counters
          if (normalized.isActive !== undefined && normalized.is_active === undefined) {
            normalized.is_active = normalized.isActive;
          }
          if (normalized.executionCount !== undefined && normalized.execution_count === undefined) {
            normalized.execution_count = normalized.executionCount;
          }
          if (normalized.successCount !== undefined && normalized.success_count === undefined) {
            normalized.success_count = normalized.successCount;
          }
          if (normalized.failureCount !== undefined && normalized.failure_count === undefined) {
            normalized.failure_count = normalized.failureCount;
          }
          if (normalized.createdAt && !normalized.created_at) {
            normalized.created_at = normalized.createdAt;
          }
          if (normalized.updatedAt && !normalized.updated_at) {
            normalized.updated_at = normalized.updatedAt;
          }
          if (normalized.lastTriggered && !normalized.last_triggered) {
            normalized.last_triggered = normalized.lastTriggered;
          }
          if (normalized.createdBy && !normalized.created_by) {
            normalized.created_by = normalized.createdBy;
          }
          
          // Delete camelCase/UI versions
          delete normalized.trigger;
          delete normalized.isActive;
          delete normalized.executionCount;
          delete normalized.successCount;
          delete normalized.failureCount;
          delete normalized.createdAt;
          delete normalized.updatedAt;
          delete normalized.lastTriggered;
          delete normalized.createdBy;
          
          // Keep only valid DB columns
          const validAutomationFields = ['id', 'tenant_id', 'name', 'description', 'is_active', 'trigger_type', 'trigger_config', 'actions', 'execution_count', 'success_count', 'failure_count', 'last_triggered', 'created_at', 'updated_at', 'created_by'];
          Object.keys(normalized).forEach(key => {
            if (!validAutomationFields.includes(key)) delete normalized[key];
          });
          break;
        
        case 'tasks':
          // Map assignedTo -> assigned_to
          if (normalized.assignedTo && !normalized.assigned_to) {
            normalized.assigned_to = normalized.assignedTo;
          }
          // Map completedAt/completed_at -> completed_date
          if (normalized.completedAt && !normalized.completed_date) {
            normalized.completed_date = normalized.completedAt;
          }
          if (normalized.completed_at && !normalized.completed_date) {
            normalized.completed_date = normalized.completed_at;
          }
          delete normalized.assignedTo;
          delete normalized.completedAt;
          delete normalized.completed_at;
          delete normalized.isAutoGenerated;
          delete normalized.currentFollowUpDate;
          
          // Validate optional UUID FKs
          if (normalized.assigned_to && !isValidUUID(normalized.assigned_to)) {
            normalized.assigned_to = null;
          }
          if (normalized.assigned_by && !isValidUUID(normalized.assigned_by)) {
            normalized.assigned_by = null;
          }
          if (normalized.hearing_id && !isValidUUID(normalized.hearing_id)) {
            normalized.hearing_id = null;
          }
          
          // Validate required FK
          if (normalized.case_id && !isValidUUID(normalized.case_id)) {
            throw new Error('Invalid case ID - please select a valid case');
          }
          
          // Keep only valid columns
          const validTaskFields = ['id', 'title', 'description', 'status', 'priority', 'case_id', 'due_date', 'assigned_to', 'created_at', 'updated_at', 'completed_date', 'hearing_id', 'tenant_id'];
          Object.keys(normalized).forEach(key => {
            if (!validTaskFields.includes(key)) delete normalized[key];
          });
          break;
          
        case 'cases':
          // Map camelCase fields to snake_case for database
          if (normalized.caseNumber && !normalized.case_number) {
            normalized.case_number = normalized.caseNumber;
          }
          if (normalized.clientId && !normalized.client_id) {
            normalized.client_id = normalized.clientId;
          }
          // State Bench location fields
          if (normalized.stateBenchState && !normalized.state_bench_state) {
            normalized.state_bench_state = normalized.stateBenchState;
          }
          if (normalized.stateBenchCity && !normalized.state_bench_city) {
            normalized.state_bench_city = normalized.stateBenchCity;
          }
          // New case classification fields
          if (normalized.caseType && !normalized.case_type) {
            normalized.case_type = normalized.caseType;
          }
          if (normalized.caseYear && !normalized.case_year) {
            normalized.case_year = normalized.caseYear;
          }
          if (normalized.caseSequence && !normalized.case_sequence) {
            normalized.case_sequence = normalized.caseSequence;
          }
          if (normalized.officeFileNo && !normalized.office_file_no) {
            normalized.office_file_no = normalized.officeFileNo;
          }
          if (normalized.issueType && !normalized.issue_type) {
            normalized.issue_type = normalized.issueType;
          }
          if (normalized.formType && !normalized.form_type) {
            normalized.form_type = normalized.formType;
          }
          if (normalized.sectionInvoked && !normalized.section_invoked) {
            normalized.section_invoked = normalized.sectionInvoked;
          }
          if (normalized.financialYear && !normalized.financial_year) {
            normalized.financial_year = normalized.financialYear;
          }
          // Accept client field as object or string
          if (!normalized.client_id && normalized.client && typeof normalized.client === 'object' && normalized.client.id) {
            normalized.client_id = normalized.client.id;
          }
          if (!normalized.client_id && typeof normalized.client === 'string') {
            normalized.client_id = normalized.client;
          }
          if (normalized.assignedTo && !normalized.assigned_to) {
            normalized.assigned_to = normalized.assignedTo;
          }
          if (normalized.ownerId && !normalized.owner_id) {
            normalized.owner_id = normalized.ownerId;
          }
          if (normalized.forumId && !normalized.forum_id) {
            normalized.forum_id = normalized.forumId;
          }
          if (normalized.authorityId && !normalized.authority_id) {
            normalized.authority_id = normalized.authorityId;
          }
          if (normalized.stageCode && !normalized.stage_code) {
            normalized.stage_code = normalized.stageCode;
          }
          if (normalized.taxDemand && !normalized.tax_demand) {
            normalized.tax_demand = normalized.taxDemand;
          }
          if (normalized.noticeDate && !normalized.notice_date) {
            normalized.notice_date = normalized.noticeDate;
          }
          if (normalized.noticeType && !normalized.notice_type) {
            normalized.notice_type = normalized.noticeType;
          }
          if (normalized.noticeNo && !normalized.notice_no) {
            normalized.notice_no = normalized.noticeNo;
          }
          if (normalized.nextHearingDate && !normalized.next_hearing_date) {
            normalized.next_hearing_date = normalized.nextHearingDate;
          }
          if (normalized.stateBenchState && !normalized.state_bench_state) {
            normalized.state_bench_state = normalized.stateBenchState;
          }
          if (normalized.stateBenchCity && !normalized.state_bench_city) {
            normalized.state_bench_city = normalized.stateBenchCity;
          }
          if (normalized.caseType && !normalized.case_type) {
            normalized.case_type = normalized.caseType;
          }
          if (normalized.caseYear && !normalized.case_year) {
            normalized.case_year = normalized.caseYear;
          }
          if (normalized.caseSequence && !normalized.case_sequence) {
            normalized.case_sequence = normalized.caseSequence;
          }
          if (normalized.officeFileNo && !normalized.office_file_no) {
            normalized.office_file_no = normalized.officeFileNo;
          }
          if (normalized.issueType && !normalized.issue_type) {
            normalized.issue_type = normalized.issueType;
          }
          if (normalized.formType && !normalized.form_type) {
            normalized.form_type = normalized.formType;
          }
          if (normalized.sectionInvoked && !normalized.section_invoked) {
            normalized.section_invoked = normalized.sectionInvoked;
          }
          if (normalized.financialYear && !normalized.financial_year) {
            normalized.financial_year = normalized.financialYear;
          }
          if (normalized.interestAmount && !normalized.interest_amount) {
            normalized.interest_amount = normalized.interestAmount;
          }
          if (normalized.penaltyAmount && !normalized.penalty_amount) {
            normalized.penalty_amount = normalized.penaltyAmount;
          }
          if (normalized.totalDemand && !normalized.total_demand) {
            normalized.total_demand = normalized.totalDemand;
          }
          if (normalized.replyDueDate && !normalized.reply_due_date) {
            normalized.reply_due_date = normalized.replyDueDate;
          }
          
          // Delete camelCase versions after mapping
          delete normalized.caseNumber;
          delete normalized.clientId;
          delete normalized.assignedTo;
          delete normalized.ownerId;
          delete normalized.forumId;
          delete normalized.authorityId;
          delete normalized.stageCode;
          delete normalized.taxDemand;
          delete normalized.noticeDate;
          delete normalized.noticeType;
          delete normalized.noticeNo;
          delete normalized.nextHearingDate;
          delete normalized.stateBenchState;
          delete normalized.stateBenchCity;
          delete normalized.caseType;
          delete normalized.caseYear;
          delete normalized.caseSequence;
          delete normalized.officeFileNo;
          delete normalized.issueType;
          delete normalized.formType;
          delete normalized.sectionInvoked;
          delete normalized.financialYear;
          
          // Map currentStage to stage_code before deletion
          if (normalized.currentStage && !normalized.stage_code) {
            normalized.stage_code = normalized.currentStage;
          }
          
          // Delete frontend-only fields (non-database fields)
          delete normalized.matterType;
          delete normalized.tribunalBench;
          delete normalized.slaStatus;
          delete normalized.currentStage;
          delete normalized.clientName;
          delete normalized.assignedToName;
          delete normalized.ownerName;
          delete normalized.timelineBreachStatus;
          
          // Validate required client_id
          if (!normalized.client_id || !isValidUUID(normalized.client_id)) {
            throw new Error('Invalid client ID - please select a valid client');
          }
          
          // Validate optional FKs
          if (normalized.assigned_to && !isValidUUID(normalized.assigned_to)) {
            normalized.assigned_to = null;
          }
          if (normalized.owner_id && !isValidUUID(normalized.owner_id)) {
            normalized.owner_id = null;
          }
          if (normalized.authority_id && !isValidUUID(normalized.authority_id)) {
            normalized.authority_id = null;
          }
          if (normalized.forum_id && !isValidUUID(normalized.forum_id)) {
            normalized.forum_id = null;
          }
          
          // Keep only valid columns
          const validCaseFields = [
            'id', 'tenant_id', 'case_number', 'title', 'description', 
            'client_id', 'stage_code', 'status', 'priority', 'assigned_to', 
            'owner_id', 'notice_type', 'notice_no', 'notice_date', 'tax_demand',
            'created_at', 'updated_at', 'forum_id', 'authority_id', 'next_hearing_date',
            'state_bench_state', 'state_bench_city', 'city',
            'case_type', 'case_year', 'case_sequence', 'office_file_no',
            'issue_type', 'form_type', 'section_invoked', 'financial_year',
            'interest_amount', 'penalty_amount', 'total_demand', 'reply_due_date'
          ];
          Object.keys(normalized).forEach(key => {
            if (!validCaseFields.includes(key)) delete normalized[key];
          });
          break;
          
        case 'hearings':
          // Map camelCase to snake_case
          if (normalized.caseId && !normalized.case_id) {
            normalized.case_id = normalized.caseId;
          }
          if (normalized.courtId && !normalized.court_id) {
            normalized.court_id = normalized.courtId;
          }
          if (normalized.courtName && !normalized.court_name) {
            normalized.court_name = normalized.courtName;
          }
          if (normalized.judgeName && !normalized.judge_name) {
            normalized.judge_name = normalized.judgeName;
          }
          if (normalized.forumId && !normalized.forum_id) {
            normalized.forum_id = normalized.forumId;
          }
          if (normalized.authorityId && !normalized.authority_id) {
            normalized.authority_id = normalized.authorityId;
          }
          if (normalized.hearingDate && !normalized.hearing_date) {
            normalized.hearing_date = normalized.hearingDate;
          }
          if (normalized.nextHearingDate && !normalized.next_hearing_date) {
            normalized.next_hearing_date = normalized.nextHearingDate;
          }
          if (normalized.createdAt && !normalized.created_at) {
            normalized.created_at = normalized.createdAt;
          }
          if (normalized.updatedAt && !normalized.updated_at) {
            normalized.updated_at = normalized.updatedAt;
          }
          
          // Build hearing_date from provided date/time accepting dd/MM/yyyy or yyyy-MM-dd and 12h/24h time
          if (!normalized.hearing_date && (normalized.date || normalized.time || normalized.start_time)) {
            const rawDate = normalized.date || '';
            const rawTime = normalized.time || normalized.start_time || '10:00';

            let year: number, month: number, day: number;
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(rawDate)) {
              const [d, m, y] = rawDate.split('/');
              day = parseInt(d, 10); month = parseInt(m, 10) - 1; year = parseInt(y, 10);
            } else if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
              const [y, m, d] = rawDate.split('-');
              year = parseInt(y, 10); month = parseInt(m, 10) - 1; day = parseInt(d, 10);
            } else {
              const now = new Date();
              year = now.getFullYear(); month = now.getMonth(); day = now.getDate();
            }

            let hours = 10; let minutes = 0;
            const t = String(rawTime).trim().toLowerCase();
            const m12 = t.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/);
            const m24 = t.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
            if (m12) {
              hours = parseInt(m12[1], 10) % 12;
              if (m12[3] === 'pm') hours += 12;
              minutes = parseInt(m12[2], 10);
            } else if (m24) {
              hours = parseInt(m24[1], 10);
              minutes = parseInt(m24[2], 10);
            }

            // Use UTC ISO to avoid timezone ambiguity
            const dt = new Date(Date.UTC(year, month, day, hours, minutes, 0));
            normalized.hearing_date = dt.toISOString();
          }
          
          // Delete camelCase versions
          delete normalized.caseId;
          delete normalized.courtId;
          delete normalized.courtName;
          delete normalized.judgeName;
          delete normalized.forumId;
          delete normalized.authorityId;
          delete normalized.hearingDate;
          delete normalized.nextHearingDate;
          delete normalized.createdAt;
          delete normalized.updatedAt;
          delete normalized.time;
          delete normalized.start_time;
          delete normalized.date;
          
          // Validate case_id only if it's being updated (conditional for partial updates)
          if (normalized.case_id !== undefined && !isValidUUID(normalized.case_id)) {
            throw new Error('Invalid case ID - please select a valid case for the hearing');
          }
          
          // Validate optional FKs
          if (normalized.court_id && !isValidUUID(normalized.court_id)) {
            normalized.court_id = null;
          }
          if (normalized.authority_id && !isValidUUID(normalized.authority_id)) {
            normalized.authority_id = null;
          }
          if (normalized.forum_id && !isValidUUID(normalized.forum_id)) {
            normalized.forum_id = null;
          }
          if (normalized.judge_id && !isValidUUID(normalized.judge_id)) {
            normalized.judge_id = null;
          }
          
          // Keep only valid columns
          const validHearingFields = ['id', 'case_id', 'hearing_date', 'next_hearing_date', 'status', 'notes', 'outcome', 'forum_id', 'authority_id', 'court_id', 'court_name', 'judge_name', 'created_at', 'updated_at', 'tenant_id'];
          Object.keys(normalized).forEach(key => {
            if (!validHearingFields.includes(key)) delete normalized[key];
          });
          break;
          
        case 'documents':
          // Map camelCase to snake_case
          if (normalized.caseId && !normalized.case_id) normalized.case_id = normalized.caseId;
          if (normalized.clientId && !normalized.client_id) normalized.client_id = normalized.clientId;
          if (normalized.taskId && !normalized.task_id) normalized.task_id = normalized.taskId;
          if (normalized.hearingId && !normalized.hearing_id) normalized.hearing_id = normalized.hearingId;
          if (normalized.uploadedBy && !normalized.uploaded_by) normalized.uploaded_by = normalized.uploadedBy;
          if (normalized.fileName && !normalized.file_name) normalized.file_name = normalized.fileName;
          if (normalized.filePath && !normalized.file_path) normalized.file_path = normalized.filePath;
          if (normalized.fileType && !normalized.file_type) normalized.file_type = normalized.fileType;
          if (normalized.fileSize && !normalized.file_size) normalized.file_size = normalized.fileSize;
          if (normalized.mimeType && !normalized.mime_type) normalized.mime_type = normalized.mimeType;
          if (normalized.folderId && !normalized.folder_id) normalized.folder_id = normalized.folderId;
          if (normalized.storageUrl && !normalized.storage_url) normalized.storage_url = normalized.storageUrl;
          if (normalized.uploadTimestamp && !normalized.upload_timestamp) normalized.upload_timestamp = normalized.uploadTimestamp;
          if (normalized.documentStatus && !normalized.document_status) normalized.document_status = normalized.documentStatus;
          if (normalized.reviewerId && !normalized.reviewer_id) normalized.reviewer_id = normalized.reviewerId;
          if (normalized.reviewDate && !normalized.review_date) normalized.review_date = normalized.reviewDate;
          if (normalized.reviewRemarks && !normalized.review_remarks) normalized.review_remarks = normalized.reviewRemarks;
          if (normalized.parentDocumentId && !normalized.parent_document_id) normalized.parent_document_id = normalized.parentDocumentId;
          if (normalized.isLatestVersion !== undefined && normalized.is_latest_version === undefined) normalized.is_latest_version = normalized.isLatestVersion;
          if (normalized.createdAt && !normalized.created_at) normalized.created_at = normalized.createdAt;
          if (normalized.updatedAt && !normalized.updated_at) normalized.updated_at = normalized.updatedAt;
          
          // Set uploaded_by fallback if missing/invalid
          if (!normalized.uploaded_by) {
            normalized.uploaded_by = this.userId;
          }
          
          // Delete camelCase versions
          delete normalized.caseId;
          delete normalized.clientId;
          delete normalized.taskId;
          delete normalized.hearingId;
          delete normalized.uploadedBy;
          delete normalized.fileName;
          delete normalized.filePath;
          delete normalized.fileType;
          delete normalized.fileSize;
          delete normalized.mimeType;
          delete normalized.folderId;
          delete normalized.storageUrl;
          delete normalized.uploadTimestamp;
          delete normalized.documentStatus;
          delete normalized.reviewerId;
          delete normalized.reviewDate;
          delete normalized.reviewRemarks;
          delete normalized.parentDocumentId;
          delete normalized.isLatestVersion;
          delete normalized.createdAt;
          delete normalized.updatedAt;
          
          // Delete UI-only fields
          delete normalized.content;
          delete normalized.name;
          delete normalized.doc_type_code;
          delete normalized.createdByName;
          
          // Validate optional UUID FKs
          if (normalized.case_id && !isValidUUID(normalized.case_id)) {
            normalized.case_id = null;
          }
          if (normalized.client_id && !isValidUUID(normalized.client_id)) {
            normalized.client_id = null;
          }
          if (normalized.hearing_id && !isValidUUID(normalized.hearing_id)) {
            normalized.hearing_id = null;
          }
          if (normalized.task_id && !isValidUUID(normalized.task_id)) {
            normalized.task_id = null;
          }
          if (normalized.folder_id && !isValidUUID(normalized.folder_id)) {
            normalized.folder_id = null;
          }
          if (normalized.reviewer_id && !isValidUUID(normalized.reviewer_id)) {
            normalized.reviewer_id = null;
          }
          if (normalized.parent_document_id && !isValidUUID(normalized.parent_document_id)) {
            normalized.parent_document_id = null;
          }
          
          // Whitelist only valid columns
          const validDocFields = ['id', 'tenant_id', 'file_name', 'file_path', 'file_type', 'file_size', 'mime_type', 'category', 'role', 'uploaded_by', 'upload_timestamp', 'is_latest_version', 'version', 'reviewer_id', 'review_date', 'review_remarks', 'remarks', 'case_id', 'client_id', 'task_id', 'hearing_id', 'parent_document_id', 'folder_id', 'storage_url', 'created_at', 'updated_at', 'document_status'];
          Object.keys(normalized).forEach(key => {
            if (!validDocFields.includes(key)) delete normalized[key];
          });
          break;
          
        case 'timeline_entries':
          // Map camelCase to snake_case
          if (normalized.caseId && !normalized.case_id) {
            normalized.case_id = normalized.caseId;
          }
          if (normalized.tenantId && !normalized.tenant_id) {
            normalized.tenant_id = normalized.tenantId;
          }
          if (normalized.createdById && !normalized.created_by) {
            normalized.created_by = normalized.createdById;
          }
          if (normalized.createdByName && !normalized.created_by_name) {
            normalized.created_by_name = normalized.createdByName;
          }
          if (normalized.createdAt && !normalized.created_at) {
            normalized.created_at = normalized.createdAt;
          }
          
          // Delete camelCase versions
          delete normalized.caseId;
          delete normalized.tenantId;
          delete normalized.createdById;
          delete normalized.createdByName;
          delete normalized.createdAt;
          
          // Delete deprecated/UI-only field
          delete normalized.createdBy; // Old string field, replaced by createdById/createdByName
          
          // Validate required case_id
          if (!normalized.case_id || !isValidUUID(normalized.case_id)) {
            throw new Error('Invalid case ID for timeline entry');
          }
          
          // Validate required created_by
          if (!normalized.created_by || !isValidUUID(normalized.created_by)) {
            throw new Error('Invalid creator UUID for timeline entry');
          }
          
          // Ensure tenant_id is present (fallback to adapter's tenant)
          if (!normalized.tenant_id) {
            normalized.tenant_id = this.tenantId;
          }
          
          // Keep only valid columns
          const validTimelineFields = [
            'id', 'case_id', 'tenant_id', 'type', 'title', 'description',
            'created_by', 'created_by_name', 'created_at', 'metadata'
          ];
          Object.keys(normalized).forEach(key => {
            if (!validTimelineFields.includes(key)) delete normalized[key];
          });
          break;
          
        case 'employees':
          // Legacy name mapping
          if (normalized.name && !normalized.full_name) normalized.full_name = normalized.name;
          
          // Map camelCase to snake_case
          if (normalized.employeeCode && !normalized.employee_code) normalized.employee_code = normalized.employeeCode;
          if (normalized.fullName && !normalized.full_name) normalized.full_name = normalized.fullName;
          if (normalized.officialEmail && !normalized.official_email) normalized.official_email = normalized.officialEmail;
          if (normalized.personalEmail && !normalized.personal_email) normalized.personal_email = normalized.personalEmail;
          if (normalized.alternateContact && !normalized.alternate_contact) normalized.alternate_contact = normalized.alternateContact;
          if (normalized.currentAddress && !normalized.current_address) normalized.current_address = normalized.currentAddress;
          if (normalized.permanentAddress && !normalized.permanent_address) normalized.permanent_address = normalized.permanentAddress;
          if (normalized.dateOfJoining && !normalized.date_of_joining) normalized.date_of_joining = normalized.dateOfJoining;
          if (normalized.dateOfBirth && !normalized.dob) normalized.dob = normalized.dateOfBirth;
          if (normalized.managerId && !normalized.manager_id) normalized.manager_id = normalized.managerId;
          if (normalized.reportingTo && !normalized.reporting_to) normalized.reporting_to = normalized.reportingTo;
          if (normalized.employmentType && !normalized.employment_type) normalized.employment_type = normalized.employmentType;
          if (normalized.graduationYear && !normalized.graduation_year) normalized.graduation_year = normalized.graduationYear;
          if (normalized.billingRate && !normalized.billing_rate) normalized.billing_rate = normalized.billingRate;
          if (normalized.incentiveEligible !== undefined && normalized.incentive_eligible === undefined) normalized.incentive_eligible = normalized.incentiveEligible;
          if (normalized.aiAccess !== undefined && normalized.ai_access === undefined) normalized.ai_access = normalized.aiAccess;
          if (normalized.whatsappAccess !== undefined && normalized.whatsapp_access === undefined) normalized.whatsapp_access = normalized.whatsappAccess;
          if (normalized.dataScope && !normalized.data_scope) normalized.data_scope = normalized.dataScope;
          if (normalized.moduleAccess && !normalized.module_access) normalized.module_access = normalized.moduleAccess;
          if (normalized.defaultTaskCategory && !normalized.default_task_category) normalized.default_task_category = normalized.defaultTaskCategory;
          if (normalized.workloadCapacity && !normalized.workload_capacity) normalized.workload_capacity = normalized.workloadCapacity;
          if (normalized.experienceYears && !normalized.experience_years) normalized.experience_years = normalized.experienceYears;
          if (normalized.gstPractitionerId && !normalized.gst_practitioner_id) normalized.gst_practitioner_id = normalized.gstPractitionerId;
          if (normalized.icaiNo && !normalized.icai_no) normalized.icai_no = normalized.icaiNo;
          if (normalized.barCouncilNo && !normalized.bar_council_no) normalized.bar_council_no = normalized.barCouncilNo;
          if (normalized.bloodGroup && !normalized.blood_group) normalized.blood_group = normalized.bloodGroup;
          if (normalized.profilePhoto && !normalized.profile_photo) normalized.profile_photo = normalized.profilePhoto;
          if (normalized.workShift && !normalized.work_shift) normalized.work_shift = normalized.workShift;
          if (normalized.weeklyOff && !normalized.weekly_off) normalized.weekly_off = normalized.weeklyOff;
          if (normalized.confirmationDate && !normalized.confirmation_date) normalized.confirmation_date = normalized.confirmationDate;
          if (normalized.createdAt && !normalized.created_at) normalized.created_at = normalized.createdAt;
          if (normalized.updatedAt && !normalized.updated_at) normalized.updated_at = normalized.updatedAt;
          if (normalized.createdBy && !normalized.created_by) normalized.created_by = normalized.createdBy;
          if (normalized.updatedBy && !normalized.updated_by) normalized.updated_by = normalized.updatedBy;
          
          // Provide safe defaults for required fields if missing
          if (!normalized.employee_code) {
            normalized.employee_code = `EMP-${normalized.id?.substring(0, 8) || Math.random().toString(36).substring(2, 10)}`;
          }
          if (!normalized.full_name) {
            normalized.full_name = 'Unknown Employee';
          }
          if (!normalized.department) {
            normalized.department = 'General';
          }
          if (!normalized.role) {
            normalized.role = 'Staff';
          }
          if (!normalized.email) {
            normalized.email = `user+${normalized.id || Math.random().toString(36).substring(2, 10)}@local.invalid`;
          }
          
          // Delete camelCase versions
          delete normalized.name;
          delete normalized.employeeCode;
          delete normalized.fullName;
          delete normalized.officialEmail;
          delete normalized.personalEmail;
          delete normalized.alternateContact;
          delete normalized.currentAddress;
          delete normalized.permanentAddress;
          delete normalized.dateOfJoining;
          delete normalized.dateOfBirth;
          delete normalized.managerId;
          delete normalized.reportingTo;
          delete normalized.employmentType;
          delete normalized.graduationYear;
          delete normalized.billingRate;
          delete normalized.incentiveEligible;
          delete normalized.aiAccess;
          delete normalized.whatsappAccess;
          delete normalized.dataScope;
          delete normalized.moduleAccess;
          delete normalized.defaultTaskCategory;
          delete normalized.workloadCapacity;
          delete normalized.experienceYears;
          delete normalized.gstPractitionerId;
          delete normalized.icaiNo;
          delete normalized.barCouncilNo;
          delete normalized.bloodGroup;
          delete normalized.profilePhoto;
          delete normalized.workShift;
          delete normalized.weeklyOff;
          delete normalized.confirmationDate;
          delete normalized.createdAt;
          delete normalized.updatedAt;
          delete normalized.createdBy;
          delete normalized.updatedBy;
          break;
          
        case 'courts':
          // Map fields
          if (normalized.establishedYear && !normalized.established_year) normalized.established_year = normalized.establishedYear;
          if (normalized.createdAt && !normalized.created_at) normalized.created_at = normalized.createdAt;
          if (normalized.updatedAt && !normalized.updated_at) normalized.updated_at = normalized.updatedAt;
          if (normalized.createdBy && !normalized.created_by) normalized.created_by = normalized.createdBy;
          
          // Delete UI-only fields
          delete normalized.activeCases;
          delete normalized.establishedYear;
          delete normalized.createdAt;
          delete normalized.updatedAt;
          delete normalized.createdBy;
          
          // Whitelist only valid columns
          const validCourtFields = ['id', 'tenant_id', 'name', 'code', 'type', 'level', 'city', 'state', 'jurisdiction', 'address', 'created_by', 'created_at', 'updated_at', 'established_year'];
          Object.keys(normalized).forEach(key => {
            if (!validCourtFields.includes(key)) delete normalized[key];
          });
          break;
          
        case 'judges':
          // Map fields
          if (normalized.courtId && !normalized.court_id) normalized.court_id = normalized.courtId;
          if (normalized.createdAt && !normalized.created_at) normalized.created_at = normalized.createdAt;
          if (normalized.updatedAt && !normalized.updated_at) normalized.updated_at = normalized.updatedAt;
          if (normalized.createdBy && !normalized.created_by) normalized.created_by = normalized.createdBy;
          
          // Delete UI-only fields
          delete normalized.appointmentDate;
          delete normalized.courtId;
          delete normalized.createdAt;
          delete normalized.updatedAt;
          delete normalized.createdBy;
          
          // Validate optional court_id FK
          if (normalized.court_id && !isValidUUID(normalized.court_id)) {
            normalized.court_id = null;
          }
          
          // Whitelist only valid columns
          const validJudgeFields = ['id', 'tenant_id', 'name', 'court_id', 'designation', 'phone', 'email', 'created_by', 'created_at', 'updated_at'];
          Object.keys(normalized).forEach(key => {
            if (!validJudgeFields.includes(key)) delete normalized[key];
          });
          break;
          
        case 'task_bundles':
          // Map trigger -> trigger_event, stage_code/stages -> stage_codes
          if (normalized.trigger && !normalized.trigger_event) {
            normalized.trigger_event = normalized.trigger;
          }
          if (normalized.stage_code || normalized.stages) {
            normalized.stage_codes = normalized.stages ?? (normalized.stage_code ? [normalized.stage_code] : null);
          }
          delete normalized.trigger;
          delete normalized.stage_code;
          delete normalized.stages;
          delete normalized.execution_mode;
          delete normalized.version;
          delete normalized.automation_flags;
          delete normalized.conditions;
          delete normalized.bundle_code;
          delete normalized.linked_module;
          delete normalized.status;
          delete normalized.default_priority;
          break;
          
        case 'task_bundle_items':
          // Map estimated_hours -> due_days
          if (normalized.estimated_hours && !normalized.due_days) {
            normalized.due_days = Math.max(1, Math.ceil(normalized.estimated_hours / 8));
          }
          delete normalized.estimated_hours;
          delete normalized.dependencies;
          delete normalized.category;
          delete normalized.due_offset;
          delete normalized.automation_flags;
          delete normalized.conditions;
          delete normalized.template_id;
          delete normalized.stage;
          delete normalized.assigned_user;
          delete normalized.trigger_type;
          delete normalized.trigger_event;
          delete normalized.checklist;
          break;
      }
      
      return normalized;
    });
  }

  /**
   * Transform case fields from snake_case to camelCase
   */
  private transformCaseFields(raw: any): any {
    return {
      ...raw,
      createdDate: raw.created_at || raw.createdDate,
      lastUpdated: raw.updated_at || raw.lastUpdated,
      caseNumber: raw.case_number || raw.caseNumber,
      clientId: raw.client_id || raw.clientId,
      assignedTo: raw.assigned_to || raw.assignedTo,
      ownerId: raw.owner_id || raw.ownerId,
      forumId: raw.forum_id || raw.forumId,
      authorityId: raw.authority_id || raw.authorityId,
      stageCode: raw.stage_code || raw.stageCode,
      taxDemand: raw.tax_demand || raw.taxDemand,
      noticeDate: raw.notice_date || raw.noticeDate,
      noticeType: raw.notice_type || raw.noticeType,
      noticeNo: raw.notice_no || raw.noticeNo,
      nextHearingDate: raw.next_hearing_date || raw.nextHearingDate,
    };
  }

  /**
   * Transform task fields from snake_case to camelCase
   */
  private transformTaskFields(raw: any): any {
    return {
      ...raw,
      // Core fields
      createdDate: raw.created_at || raw.createdDate,
      lastUpdated: raw.updated_at || raw.lastUpdated,
      dueDate: raw.due_date || raw.dueDate,
      completedDate: raw.completed_date || raw.completedDate,
      
      // FK mappings
      assignedTo: raw.assigned_to || raw.assignedTo,
      assignedToId: raw.assigned_to || raw.assignedToId,
      assignedBy: raw.assigned_by || raw.assignedBy,
      assignedById: raw.assigned_by || raw.assignedById,
      caseId: raw.case_id || raw.caseId,
      clientId: raw.client_id || raw.clientId,
      hearingId: raw.hearing_id || raw.hearingId,
      
      // Additional fields
      caseNumber: raw.case_number || raw.caseNumber,
      stage: raw.stage,
      estimatedHours: raw.estimated_hours !== undefined ? raw.estimated_hours : raw.estimatedHours,
      actualHours: raw.actual_hours !== undefined ? raw.actual_hours : raw.actualHours,
      isAutoGenerated: raw.is_auto_generated !== undefined ? raw.is_auto_generated : raw.isAutoGenerated,
      escalationLevel: raw.escalation_level !== undefined ? raw.escalation_level : raw.escalationLevel,
      timezone: raw.timezone || 'Asia/Kolkata',
      dueDateValidated: raw.due_date_validated !== undefined ? raw.due_date_validated : raw.dueDateValidated,
      tags: raw.tags || [],
    };
  }
  
  /**
   * Transform client fields from snake_case to camelCase
   */
  private transformClientFields(raw: any): any {
    return {
      ...raw,
      name: raw.display_name || raw.name,
      clientGroupId: raw.client_group_id || raw.clientGroupId,
      assignedCAId: raw.owner_id || raw.assignedCAId,
      createdAt: raw.created_at || raw.createdAt,
      updatedAt: raw.updated_at || raw.updatedAt,
    };
  }
  
  /**
   * Transform automation_rules from flat to nested structure
   */
  private transformAutomationRuleFields(raw: any): any {
    return {
      ...raw,
      isActive: raw.is_active !== undefined ? raw.is_active : raw.isActive,
      trigger: {
        event: raw.trigger_type || raw.trigger?.event || 'manual',
        conditions: raw.trigger_config || raw.trigger?.conditions || undefined,
      },
      executionCount: raw.execution_count !== undefined ? raw.execution_count : raw.executionCount || 0,
      successCount: raw.success_count !== undefined ? raw.success_count : raw.successCount || 0,
      failureCount: raw.failure_count !== undefined ? raw.failure_count : raw.failureCount || 0,
      createdAt: raw.created_at || raw.createdAt,
      updatedAt: raw.updated_at || raw.updatedAt,
      lastTriggered: raw.last_triggered || raw.lastTriggered,
      createdBy: raw.created_by || raw.createdBy,
    };
  }

  /**
   * Transform timeline_entries from snake_case to camelCase
   */
  private transformTimelineFields(raw: any): any {
    return {
      ...raw,
      caseId: raw.case_id || raw.caseId,
      tenantId: raw.tenant_id || raw.tenantId,
      createdBy: raw.created_by_name || raw.createdBy || 'Unknown',
      createdById: raw.created_by || raw.createdById,
      createdByName: raw.created_by_name || raw.createdByName,
      createdAt: raw.created_at || raw.createdAt,
    };
  }

  // ============= LIFECYCLE =============

  async destroy(): Promise<void> {
    // Unsubscribe from auth listener
    if (this.authSubscription) {
      this.authSubscription.subscription?.unsubscribe();
      this.authSubscription = null;
      console.log('🔌 Auth listener unsubscribed');
    }
    
    this.queryCache.clear();
    this.tenantId = null;
    this.userId = null;
    this.initialized = false;
    this.initializationPromise = null;
    console.log('🔌 SupabaseAdapter destroyed');
  }
  
  /**
   * Helper to invalidate all cache entries
   */
  private invalidateAllCache(): void {
    this.queryCache.clear();
    console.log('🗑️ Cache cleared');
  }
}

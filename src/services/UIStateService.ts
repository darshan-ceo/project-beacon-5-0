/**
 * UI State Service
 * Manages user preferences, filters, and view settings in Supabase
 */

import { supabase } from '@/integrations/supabase/client';

export type UIStateCategory = 
  | 'filters'
  | 'preferences' 
  | 'view_settings'
  | 'column_visibility'
  | 'sort_settings'
  | 'layout';

export interface UIStateItem<T = any> {
  key: string;
  value: T;
  category: UIStateCategory;
  description?: string;
  userId?: string;
}

class UIStateService {
  private cache: Map<string, any> = new Map();
  private tenantId: string | null = null;
  private userId: string | null = null;

  /**
   * Initialize service with user context
   */
  async initialize(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      this.userId = user.id;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .maybeSingle();
      
      if (profile) {
        this.tenantId = profile.tenant_id;
      }
    }
  }

  /**
   * Get UI state value
   */
  async get<T = any>(key: string): Promise<T | null> {
    // Check cache first
    if (this.cache.has(key)) {
      return this.cache.get(key) as T;
    }

    if (!this.tenantId) {
      await this.initialize();
    }

    if (!this.tenantId) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('tenant_id', this.tenantId)
        .eq('setting_key', key)
        .maybeSingle();

      if (error) {
        console.error('Failed to get UI state:', error);
        return null;
      }

      const value = data?.setting_value as T;
      
      // Update cache
      if (value !== null && value !== undefined) {
        this.cache.set(key, value);
      }

      return value || null;
    } catch (error) {
      console.error('Error getting UI state:', error);
      return null;
    }
  }

  /**
   * Set UI state value
   */
  async set<T = any>(
    key: string, 
    value: T, 
    options?: {
      category?: UIStateCategory;
      description?: string;
    }
  ): Promise<boolean> {
    if (!this.tenantId || !this.userId) {
      await this.initialize();
    }

    if (!this.tenantId || !this.userId) {
      console.error('Cannot set UI state: tenant or user not found');
      return false;
    }

    try {
      // Check if setting exists
      const { data: existing } = await supabase
        .from('system_settings')
        .select('id')
        .eq('tenant_id', this.tenantId)
        .eq('setting_key', key)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('system_settings')
          .update({
            setting_value: value as any,
            updated_at: new Date().toISOString(),
            updated_by: this.userId
          })
          .eq('id', existing.id);

        if (error) {
          console.error('Failed to update UI state:', error);
          return false;
        }
      } else {
        // Create new
        const { error } = await supabase
          .from('system_settings')
          .insert({
            tenant_id: this.tenantId as string,
            setting_key: key,
            setting_value: value as any,
            category: options?.category || 'preferences',
            description: options?.description,
            updated_by: this.userId
          } as any);

        if (error) {
          console.error('Failed to create UI state:', error);
          return false;
        }
      }

      // Update cache
      this.cache.set(key, value);
      return true;
    } catch (error) {
      console.error('Error setting UI state:', error);
      return false;
    }
  }

  /**
   * Remove UI state value
   */
  async remove(key: string): Promise<boolean> {
    if (!this.tenantId) {
      await this.initialize();
    }

    if (!this.tenantId) {
      return false;
    }

    try {
      const { error } = await supabase
        .from('system_settings')
        .delete()
        .eq('tenant_id', this.tenantId)
        .eq('setting_key', key);

      if (error) {
        console.error('Failed to remove UI state:', error);
        return false;
      }

      // Clear from cache
      this.cache.delete(key);
      return true;
    } catch (error) {
      console.error('Error removing UI state:', error);
      return false;
    }
  }

  /**
   * Get all UI state for a category
   */
  async getByCategory(category: UIStateCategory): Promise<Record<string, any>> {
    if (!this.tenantId) {
      await this.initialize();
    }

    if (!this.tenantId) {
      return {};
    }

    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .eq('tenant_id', this.tenantId)
        .eq('category', category);

      if (error) {
        console.error('Failed to get UI state by category:', error);
        return {};
      }

      const result: Record<string, any> = {};
      data?.forEach(item => {
        result[item.setting_key] = item.setting_value;
        this.cache.set(item.setting_key, item.setting_value);
      });

      return result;
    } catch (error) {
      console.error('Error getting UI state by category:', error);
      return {};
    }
  }

  /**
   * Migrate data from localStorage to Supabase
   */
  async migrateFromLocalStorage(): Promise<{
    migrated: number;
    errors: string[];
  }> {
    const migrated = 0;
    const errors: string[] = [];

    if (!this.tenantId) {
      await this.initialize();
    }

    if (!this.tenantId) {
      errors.push('No tenant context available');
      return { migrated, errors };
    }

    // Define localStorage keys to migrate
    const keyMappings: Array<{
      localKey: string;
      supabaseKey: string;
      category: UIStateCategory;
      description?: string;
    }> = [
      { localKey: 'case_filters', supabaseKey: 'ui.cases.filters', category: 'filters', description: 'Case list filters' },
      { localKey: 'case_sort', supabaseKey: 'ui.cases.sort', category: 'sort_settings', description: 'Case list sorting' },
      { localKey: 'case_columns', supabaseKey: 'ui.cases.columns', category: 'column_visibility', description: 'Case list column visibility' },
      { localKey: 'task_filters', supabaseKey: 'ui.tasks.filters', category: 'filters', description: 'Task list filters' },
      { localKey: 'task_sort', supabaseKey: 'ui.tasks.sort', category: 'sort_settings', description: 'Task list sorting' },
      { localKey: 'document_view', supabaseKey: 'ui.documents.view', category: 'view_settings', description: 'Document view preference' },
      { localKey: 'sidebar_collapsed', supabaseKey: 'ui.layout.sidebar_collapsed', category: 'layout', description: 'Sidebar state' },
      { localKey: 'theme_preference', supabaseKey: 'ui.theme', category: 'preferences', description: 'Theme preference' },
      { localKey: 'table_page_size', supabaseKey: 'ui.table.page_size', category: 'preferences', description: 'Default table page size' },
      { localKey: 'dashboard_widgets', supabaseKey: 'ui.dashboard.widgets', category: 'layout', description: 'Dashboard widget configuration' },
    ];

    let migratedCount = 0;

    for (const mapping of keyMappings) {
      try {
        const localValue = localStorage.getItem(mapping.localKey);
        
        if (localValue !== null) {
          let parsedValue: any;
          
          try {
            parsedValue = JSON.parse(localValue);
          } catch {
            parsedValue = localValue;
          }

          const success = await this.set(mapping.supabaseKey, parsedValue, {
            category: mapping.category,
            description: mapping.description
          });

          if (success) {
            migratedCount++;
            // Remove from localStorage after successful migration
            localStorage.removeItem(mapping.localKey);
          } else {
            errors.push(`Failed to migrate ${mapping.localKey}`);
          }
        }
      } catch (error) {
        errors.push(`Error migrating ${mapping.localKey}: ${error}`);
      }
    }

    return { migrated: migratedCount, errors };
  }

  /**
   * Clear all UI state (useful for reset/logout)
   */
  async clearAll(category?: UIStateCategory): Promise<boolean> {
    if (!this.tenantId) {
      await this.initialize();
    }

    if (!this.tenantId) {
      return false;
    }

    try {
      let query = supabase
        .from('system_settings')
        .delete()
        .eq('tenant_id', this.tenantId);

      if (category) {
        query = query.eq('category', category);
      }

      const { error } = await query;

      if (error) {
        console.error('Failed to clear UI state:', error);
        return false;
      }

      // Clear cache
      if (category) {
        // Clear only items from this category (we'd need to track category in cache)
        this.cache.clear();
      } else {
        this.cache.clear();
      }

      return true;
    } catch (error) {
      console.error('Error clearing UI state:', error);
      return false;
    }
  }

  /**
   * Clear local cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export const uiStateService = new UIStateService();

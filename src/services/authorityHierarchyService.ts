/**
 * Authority Hierarchy Service
 * Manages authority levels and their matter type hierarchies using Supabase
 */

import { supabase } from '@/integrations/supabase/client';
import { 
  AuthorityHierarchyMaster, 
  AuthorityLevelConfig, 
  MatterTypeConfig,
  DEFAULT_AUTHORITY_HIERARCHY 
} from '@/types/authority-matter-hierarchy';

class AuthorityHierarchyService {
  private hierarchy: AuthorityHierarchyMaster = DEFAULT_AUTHORITY_HIERARCHY;
  private tenantId: string | null = null;
  private initialized = false;

  private async getTenantId(): Promise<string> {
    if (this.tenantId) return this.tenantId;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();
    
    if (!profile?.tenant_id) throw new Error('Tenant not found');
    this.tenantId = profile.tenant_id;
    return this.tenantId;
  }

  /**
   * Initialize and load hierarchy from Supabase
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      const tenantId = await this.getTenantId();
      
      // Load authority levels
      const { data: levels, error: levelsError } = await supabase
        .from('authority_levels')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('sort_order');
      
      if (levelsError) throw levelsError;

      // If no custom levels, use defaults
      if (!levels || levels.length === 0) {
        this.hierarchy = { ...DEFAULT_AUTHORITY_HIERARCHY };
        this.initialized = true;
        return;
      }

      // Load matter types for each level
      const { data: matterTypes, error: mtError } = await supabase
        .from('matter_types')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('sort_order');

      if (mtError) throw mtError;

      // Build hierarchy
      const authorityLevels: AuthorityLevelConfig[] = levels.map(level => {
        const config = level.config as Record<string, any> || {};
        return {
          id: level.code,
          name: level.name,
          description: config.description || level.name,
          hint: config.hint || '',
          color: config.color || 'bg-gray-500 text-white',
          isActive: level.is_active ?? true,
          sortOrder: level.sort_order || 0,
          allowsMatterTypes: level.allows_matter_types ?? false,
          matterTypes: (matterTypes || [])
            .filter(mt => mt.authority_level_id === level.id)
            .map(mt => {
              const mtConfig = mt.location_metadata as Record<string, any> || {};
              return {
                id: mt.code,
                name: mt.name,
                description: mtConfig.description || mt.name,
                isActive: mt.is_active ?? true,
                sortOrder: mt.sort_order || 0,
                requiresLocation: mt.requires_location ?? false,
                locations: mtConfig.locations
              };
            })
        };
      });

      this.hierarchy = {
        version: '2.0',
        lastUpdated: new Date().toISOString(),
        authorityLevels
      };

      this.initialized = true;
    } catch (error) {
      console.error('Failed to load authority hierarchy from Supabase:', error);
      // Fallback to defaults
      this.hierarchy = { ...DEFAULT_AUTHORITY_HIERARCHY };
      this.initialized = true;
    }
  }

  /**
   * Get all active authority levels
   */
  getActiveAuthorityLevels(): AuthorityLevelConfig[] {
    return this.hierarchy.authorityLevels
      .filter(level => level.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  /**
   * Get all authority levels (including inactive)
   */
  getAllAuthorityLevels(): AuthorityLevelConfig[] {
    return [...this.hierarchy.authorityLevels].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  /**
   * Get authority level by ID
   */
  getAuthorityLevelById(id: string): AuthorityLevelConfig | undefined {
    return this.hierarchy.authorityLevels.find(level => level.id === id);
  }

  /**
   * Check if an authority level allows matter types
   */
  allowsMatterTypes(authorityLevelId: string): boolean {
    const level = this.getAuthorityLevelById(authorityLevelId);
    return level?.allowsMatterTypes || false;
  }

  /**
   * Get matter types for a specific authority level
   */
  getMatterTypesByLevel(authorityLevelId: string): MatterTypeConfig[] {
    const level = this.getAuthorityLevelById(authorityLevelId);
    if (!level || !level.allowsMatterTypes) {
      return [];
    }
    return level.matterTypes
      .filter(mt => mt.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  /**
   * Get all matter types for a level (including inactive)
   */
  getAllMatterTypesByLevel(authorityLevelId: string): MatterTypeConfig[] {
    const level = this.getAuthorityLevelById(authorityLevelId);
    if (!level) return [];
    return [...level.matterTypes].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  /**
   * Get matter type by ID within an authority level
   */
  getMatterTypeById(authorityLevelId: string, matterTypeId: string): MatterTypeConfig | undefined {
    const level = this.getAuthorityLevelById(authorityLevelId);
    return level?.matterTypes.find(mt => mt.id === matterTypeId);
  }

  /**
   * Find matter type across all authority levels
   */
  findMatterTypeGlobal(matterTypeId: string): { level: AuthorityLevelConfig; matterType: MatterTypeConfig } | undefined {
    for (const level of this.hierarchy.authorityLevels) {
      const matterType = level.matterTypes.find(mt => mt.id === matterTypeId);
      if (matterType) {
        return { level, matterType };
      }
    }
    return undefined;
  }

  /**
   * Add a new authority level
   */
  async addAuthorityLevel(level: Omit<AuthorityLevelConfig, 'sortOrder'>): Promise<void> {
    const tenantId = await this.getTenantId();
    const maxSort = Math.max(0, ...this.hierarchy.authorityLevels.map(l => l.sortOrder));
    
    const { error } = await supabase
      .from('authority_levels')
      .insert({
        tenant_id: tenantId,
        code: level.id,
        name: level.name,
        label: level.name,
        sort_order: maxSort + 1,
        is_active: level.isActive ?? true,
        allows_matter_types: level.allowsMatterTypes ?? false,
        requires_location: false,
        config: {
          description: level.description,
          hint: level.hint,
          color: level.color
        }
      });

    if (error) throw error;

    // Update local cache
    const newLevel: AuthorityLevelConfig = {
      ...level,
      sortOrder: maxSort + 1,
      matterTypes: level.matterTypes || []
    };
    this.hierarchy.authorityLevels.push(newLevel);
  }

  /**
   * Update an authority level
   */
  async updateAuthorityLevel(id: string, updates: Partial<AuthorityLevelConfig>): Promise<void> {
    const tenantId = await this.getTenantId();
    const existing = this.getAuthorityLevelById(id);
    
    const updateData: Record<string, any> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.sortOrder !== undefined) updateData.sort_order = updates.sortOrder;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
    if (updates.allowsMatterTypes !== undefined) updateData.allows_matter_types = updates.allowsMatterTypes;
    
    // Store extended properties in config JSON
    if (updates.description !== undefined || updates.hint !== undefined || updates.color !== undefined) {
      updateData.config = {
        description: updates.description ?? existing?.description,
        hint: updates.hint ?? existing?.hint,
        color: updates.color ?? existing?.color
      };
    }
    
    const { error } = await supabase
      .from('authority_levels')
      .update(updateData)
      .eq('tenant_id', tenantId)
      .eq('code', id);

    if (error) throw error;

    // Update local cache
    const index = this.hierarchy.authorityLevels.findIndex(l => l.id === id);
    if (index !== -1) {
      this.hierarchy.authorityLevels[index] = {
        ...this.hierarchy.authorityLevels[index],
        ...updates
      };
    }
  }

  /**
   * Delete an authority level
   */
  async deleteAuthorityLevel(id: string): Promise<void> {
    const tenantId = await this.getTenantId();
    
    const { error } = await supabase
      .from('authority_levels')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('code', id);

    if (error) throw error;

    this.hierarchy.authorityLevels = this.hierarchy.authorityLevels.filter(l => l.id !== id);
  }

  /**
   * Add a matter type to an authority level
   */
  async addMatterType(authorityLevelId: string, matterType: Omit<MatterTypeConfig, 'sortOrder'>): Promise<void> {
    const level = this.getAuthorityLevelById(authorityLevelId);
    if (!level || !level.allowsMatterTypes) {
      throw new Error('Authority level does not support matter types');
    }

    const tenantId = await this.getTenantId();
    
    // Get the authority_level database ID
    const { data: dbLevel } = await supabase
      .from('authority_levels')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('code', authorityLevelId)
      .single();

    if (!dbLevel) throw new Error('Authority level not found in database');

    const maxSort = Math.max(0, ...level.matterTypes.map(mt => mt.sortOrder));
    
    const insertData = {
      tenant_id: tenantId,
      authority_level_id: dbLevel.id,
      code: matterType.id,
      name: matterType.name,
      label: matterType.name,
      sort_order: maxSort + 1,
      is_active: matterType.isActive ?? true,
      requires_location: matterType.requiresLocation ?? false,
      location_metadata: {
        description: matterType.description,
        locations: matterType.locations
      }
    };

    const { error } = await supabase
      .from('matter_types')
      .insert(insertData as any);

    if (error) throw error;
    
    const newMatterType: MatterTypeConfig = {
      ...matterType,
      sortOrder: maxSort + 1
    };
    
    level.matterTypes.push(newMatterType);
  }

  /**
   * Update a matter type
   */
  async updateMatterType(authorityLevelId: string, matterTypeId: string, updates: Partial<MatterTypeConfig>): Promise<void> {
    const tenantId = await this.getTenantId();
    const level = this.getAuthorityLevelById(authorityLevelId);
    const existing = level?.matterTypes.find(mt => mt.id === matterTypeId);
    
    const updateData: Record<string, any> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.sortOrder !== undefined) updateData.sort_order = updates.sortOrder;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
    if (updates.requiresLocation !== undefined) updateData.requires_location = updates.requiresLocation;
    
    if (updates.description !== undefined || updates.locations !== undefined) {
      updateData.location_metadata = {
        description: updates.description ?? existing?.description,
        locations: updates.locations ?? existing?.locations
      };
    }
    
    const { error } = await supabase
      .from('matter_types')
      .update(updateData)
      .eq('tenant_id', tenantId)
      .eq('code', matterTypeId);

    if (error) throw error;

    if (!level) return;
    
    const index = level.matterTypes.findIndex(mt => mt.id === matterTypeId);
    if (index !== -1) {
      level.matterTypes[index] = {
        ...level.matterTypes[index],
        ...updates
      };
    }
  }

  /**
   * Delete a matter type
   */
  async deleteMatterType(authorityLevelId: string, matterTypeId: string): Promise<void> {
    const tenantId = await this.getTenantId();
    
    const { error } = await supabase
      .from('matter_types')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('code', matterTypeId);

    if (error) throw error;

    const level = this.getAuthorityLevelById(authorityLevelId);
    if (!level) return;
    
    level.matterTypes = level.matterTypes.filter(mt => mt.id !== matterTypeId);
  }

  /**
   * Reorder authority levels
   */
  async reorderAuthorityLevels(levelIds: string[]): Promise<void> {
    const tenantId = await this.getTenantId();
    
    for (let i = 0; i < levelIds.length; i++) {
      await supabase
        .from('authority_levels')
        .update({ sort_order: i + 1 })
        .eq('tenant_id', tenantId)
        .eq('code', levelIds[i]);
      
      const level = this.getAuthorityLevelById(levelIds[i]);
      if (level) {
        level.sortOrder = i + 1;
      }
    }
  }

  /**
   * Reorder matter types within an authority level
   */
  async reorderMatterTypes(authorityLevelId: string, matterTypeIds: string[]): Promise<void> {
    const tenantId = await this.getTenantId();
    const level = this.getAuthorityLevelById(authorityLevelId);
    if (!level) return;
    
    for (let i = 0; i < matterTypeIds.length; i++) {
      await supabase
        .from('matter_types')
        .update({ sort_order: i + 1 })
        .eq('tenant_id', tenantId)
        .eq('code', matterTypeIds[i]);
      
      const matterType = level.matterTypes.find(mt => mt.id === matterTypeIds[i]);
      if (matterType) {
        matterType.sortOrder = i + 1;
      }
    }
  }

  /**
   * Reset to default hierarchy
   */
  async resetToDefault(): Promise<void> {
    const tenantId = await this.getTenantId();
    
    // Delete all custom levels and types
    await supabase.from('matter_types').delete().eq('tenant_id', tenantId);
    await supabase.from('authority_levels').delete().eq('tenant_id', tenantId);
    
    this.hierarchy = { ...DEFAULT_AUTHORITY_HIERARCHY };
  }

  /**
   * Export hierarchy as JSON
   */
  exportHierarchy(): string {
    return JSON.stringify(this.hierarchy, null, 2);
  }

  /**
   * Import hierarchy from JSON
   */
  async importHierarchy(json: string): Promise<void> {
    try {
      const imported = JSON.parse(json) as AuthorityHierarchyMaster;
      if (!imported.authorityLevels || !Array.isArray(imported.authorityLevels)) {
        throw new Error('Invalid hierarchy structure');
      }
      
      // Clear existing and import new
      await this.resetToDefault();
      
      for (const level of imported.authorityLevels) {
        await this.addAuthorityLevel(level);
        
        if (level.matterTypes) {
          for (const mt of level.matterTypes) {
            await this.addMatterType(level.id, mt);
          }
        }
      }
      
      this.hierarchy = imported;
    } catch (error) {
      throw new Error('Failed to import hierarchy: ' + (error as Error).message);
    }
  }

  /**
   * Validate if a matter type is valid for an authority level
   */
  validateMatterType(authorityLevelId: string, matterTypeId: string): boolean {
    const level = this.getAuthorityLevelById(authorityLevelId);
    if (!level || !level.allowsMatterTypes) return false;
    return level.matterTypes.some(mt => mt.id === matterTypeId && mt.isActive);
  }

  /**
   * Get hierarchy statistics
   */
  getStatistics() {
    const totalLevels = this.hierarchy.authorityLevels.length;
    const activeLevels = this.hierarchy.authorityLevels.filter(l => l.isActive).length;
    const levelsWithMatterTypes = this.hierarchy.authorityLevels.filter(l => l.allowsMatterTypes).length;
    const totalMatterTypes = this.hierarchy.authorityLevels.reduce((sum, l) => sum + l.matterTypes.length, 0);
    
    return {
      totalLevels,
      activeLevels,
      levelsWithMatterTypes,
      totalMatterTypes
    };
  }
}

export const authorityHierarchyService = new AuthorityHierarchyService();

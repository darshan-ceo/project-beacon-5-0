/**
 * Authority Hierarchy Service
 * Manages authority levels and their matter type hierarchies
 */

import { 
  AuthorityHierarchyMaster, 
  AuthorityLevelConfig, 
  MatterTypeConfig,
  DEFAULT_AUTHORITY_HIERARCHY 
} from '@/types/authority-matter-hierarchy';

const STORAGE_KEY = 'authority_hierarchy_master';

class AuthorityHierarchyService {
  private hierarchy: AuthorityHierarchyMaster;

  constructor() {
    this.hierarchy = this.loadHierarchy();
  }

  /**
   * Load hierarchy from storage or initialize with defaults
   */
  private loadHierarchy(): AuthorityHierarchyMaster {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load authority hierarchy:', error);
    }
    return DEFAULT_AUTHORITY_HIERARCHY;
  }

  /**
   * Save hierarchy to storage
   */
  private saveHierarchy(): void {
    try {
      this.hierarchy.lastUpdated = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.hierarchy));
    } catch (error) {
      console.error('Failed to save authority hierarchy:', error);
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
  addAuthorityLevel(level: Omit<AuthorityLevelConfig, 'sortOrder'>): void {
    const maxSort = Math.max(0, ...this.hierarchy.authorityLevels.map(l => l.sortOrder));
    const newLevel: AuthorityLevelConfig = {
      ...level,
      sortOrder: maxSort + 1,
      matterTypes: level.matterTypes || []
    };
    this.hierarchy.authorityLevels.push(newLevel);
    this.saveHierarchy();
  }

  /**
   * Update an authority level
   */
  updateAuthorityLevel(id: string, updates: Partial<AuthorityLevelConfig>): void {
    const index = this.hierarchy.authorityLevels.findIndex(l => l.id === id);
    if (index !== -1) {
      this.hierarchy.authorityLevels[index] = {
        ...this.hierarchy.authorityLevels[index],
        ...updates
      };
      this.saveHierarchy();
    }
  }

  /**
   * Delete an authority level
   */
  deleteAuthorityLevel(id: string): void {
    this.hierarchy.authorityLevels = this.hierarchy.authorityLevels.filter(l => l.id !== id);
    this.saveHierarchy();
  }

  /**
   * Add a matter type to an authority level
   */
  addMatterType(authorityLevelId: string, matterType: Omit<MatterTypeConfig, 'sortOrder'>): void {
    const level = this.getAuthorityLevelById(authorityLevelId);
    if (!level || !level.allowsMatterTypes) {
      throw new Error('Authority level does not support matter types');
    }
    
    const maxSort = Math.max(0, ...level.matterTypes.map(mt => mt.sortOrder));
    const newMatterType: MatterTypeConfig = {
      ...matterType,
      sortOrder: maxSort + 1
    };
    
    level.matterTypes.push(newMatterType);
    this.saveHierarchy();
  }

  /**
   * Update a matter type
   */
  updateMatterType(authorityLevelId: string, matterTypeId: string, updates: Partial<MatterTypeConfig>): void {
    const level = this.getAuthorityLevelById(authorityLevelId);
    if (!level) return;
    
    const index = level.matterTypes.findIndex(mt => mt.id === matterTypeId);
    if (index !== -1) {
      level.matterTypes[index] = {
        ...level.matterTypes[index],
        ...updates
      };
      this.saveHierarchy();
    }
  }

  /**
   * Delete a matter type
   */
  deleteMatterType(authorityLevelId: string, matterTypeId: string): void {
    const level = this.getAuthorityLevelById(authorityLevelId);
    if (!level) return;
    
    level.matterTypes = level.matterTypes.filter(mt => mt.id !== matterTypeId);
    this.saveHierarchy();
  }

  /**
   * Reorder authority levels
   */
  reorderAuthorityLevels(levelIds: string[]): void {
    levelIds.forEach((id, index) => {
      const level = this.getAuthorityLevelById(id);
      if (level) {
        level.sortOrder = index + 1;
      }
    });
    this.saveHierarchy();
  }

  /**
   * Reorder matter types within an authority level
   */
  reorderMatterTypes(authorityLevelId: string, matterTypeIds: string[]): void {
    const level = this.getAuthorityLevelById(authorityLevelId);
    if (!level) return;
    
    matterTypeIds.forEach((id, index) => {
      const matterType = level.matterTypes.find(mt => mt.id === id);
      if (matterType) {
        matterType.sortOrder = index + 1;
      }
    });
    this.saveHierarchy();
  }

  /**
   * Reset to default hierarchy
   */
  resetToDefault(): void {
    this.hierarchy = { ...DEFAULT_AUTHORITY_HIERARCHY };
    this.saveHierarchy();
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
  importHierarchy(json: string): void {
    try {
      const imported = JSON.parse(json) as AuthorityHierarchyMaster;
      // Validate structure
      if (!imported.authorityLevels || !Array.isArray(imported.authorityLevels)) {
        throw new Error('Invalid hierarchy structure');
      }
      this.hierarchy = imported;
      this.saveHierarchy();
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

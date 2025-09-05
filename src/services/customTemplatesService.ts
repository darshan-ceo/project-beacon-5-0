/**
 * Custom Templates Service
 * Handles storage and management of user-customized templates
 */

import { FormTemplate } from './formTemplatesService';
import { toast } from '@/hooks/use-toast';

interface CustomTemplate extends FormTemplate {
  id?: string;
  isCustom: true;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  customization?: {
    companyHeader?: string;
    companyFooter?: string;
    branding?: {
      logoUrl?: string;
      primaryColor?: string;
      fontFamily?: string;
    };
  };
  baseTemplate?: string; // Reference to original template if this is a customization
}

interface TemplateVersion {
  version: string;
  template: CustomTemplate;
  createdAt: string;
  description?: string;
}

class CustomTemplatesService {
  private storageKey = 'custom_templates';
  private versionsKey = 'template_versions';

  /**
   * Save a custom template
   */
  async saveTemplate(template: Omit<CustomTemplate, 'id' | 'isCustom' | 'createdAt' | 'updatedAt'>): Promise<CustomTemplate> {
    try {
      const customTemplate: CustomTemplate = {
        ...template,
        id: this.generateId(),
        isCustom: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const existingTemplates = this.getStoredTemplates();
      const updatedTemplates = [...existingTemplates, customTemplate];
      
      localStorage.setItem(this.storageKey, JSON.stringify(updatedTemplates));
      
      // Save version history
      this.saveTemplateVersion(customTemplate, 'Initial version');
      
      return customTemplate;
    } catch (error) {
      console.error('Error saving custom template:', error);
      throw new Error('Failed to save template');
    }
  }

  /**
   * Update an existing custom template
   */
  async updateTemplate(templateId: string, updates: Partial<CustomTemplate>): Promise<CustomTemplate> {
    try {
      const existingTemplates = this.getStoredTemplates();
      const templateIndex = existingTemplates.findIndex(t => t.id === templateId);
      
      if (templateIndex === -1) {
        throw new Error('Template not found');
      }

      const updatedTemplate: CustomTemplate = {
        ...existingTemplates[templateIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };

      existingTemplates[templateIndex] = updatedTemplate;
      localStorage.setItem(this.storageKey, JSON.stringify(existingTemplates));
      
      // Save version history
      this.saveTemplateVersion(updatedTemplate, 'Updated template');
      
      return updatedTemplate;
    } catch (error) {
      console.error('Error updating custom template:', error);
      throw new Error('Failed to update template');
    }
  }

  /**
   * Get all custom templates
   */
  async getCustomTemplates(): Promise<CustomTemplate[]> {
    try {
      return this.getStoredTemplates();
    } catch (error) {
      console.error('Error fetching custom templates:', error);
      return [];
    }
  }

  /**
   * Get custom template by ID
   */
  async getTemplateById(templateId: string): Promise<CustomTemplate | null> {
    try {
      const templates = this.getStoredTemplates();
      return templates.find(t => t.id === templateId) || null;
    } catch (error) {
      console.error('Error fetching template by ID:', error);
      return null;
    }
  }

  /**
   * Delete a custom template
   */
  async deleteTemplate(templateId: string): Promise<boolean> {
    try {
      const existingTemplates = this.getStoredTemplates();
      const filteredTemplates = existingTemplates.filter(t => t.id !== templateId);
      
      localStorage.setItem(this.storageKey, JSON.stringify(filteredTemplates));
      
      // Clean up version history
      this.deleteTemplateVersions(templateId);
      
      return true;
    } catch (error) {
      console.error('Error deleting custom template:', error);
      return false;
    }
  }

  /**
   * Duplicate an existing template
   */
  async duplicateTemplate(templateId: string, newTitle: string): Promise<CustomTemplate> {
    try {
      const originalTemplate = await this.getTemplateById(templateId);
      if (!originalTemplate) {
        throw new Error('Original template not found');
      }

      const duplicatedTemplate = {
        ...originalTemplate,
        title: newTitle,
        code: `${originalTemplate.code}_COPY_${Date.now()}`,
        baseTemplate: originalTemplate.baseTemplate || originalTemplate.code,
        createdBy: 'current_user' // This should come from auth context
      };

      // Remove the ID so a new one is generated
      const { id, ...templateWithoutId } = duplicatedTemplate;
      
      return await this.saveTemplate(templateWithoutId);
    } catch (error) {
      console.error('Error duplicating template:', error);
      throw new Error('Failed to duplicate template');
    }
  }

  /**
   * Get template version history
   */
  async getTemplateVersions(templateId: string): Promise<TemplateVersion[]> {
    try {
      const versions = this.getStoredVersions();
      return versions.filter(v => v.template.id === templateId)
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      console.error('Error fetching template versions:', error);
      return [];
    }
  }

  /**
   * Restore template to a specific version
   */
  async restoreTemplateVersion(templateId: string, version: string): Promise<CustomTemplate> {
    try {
      const versions = await this.getTemplateVersions(templateId);
      const targetVersion = versions.find(v => v.version === version);
      
      if (!targetVersion) {
        throw new Error('Version not found');
      }

      const restoredTemplate = {
        ...targetVersion.template,
        updatedAt: new Date().toISOString()
      };

      await this.updateTemplate(templateId, restoredTemplate);
      this.saveTemplateVersion(restoredTemplate, `Restored to version ${version}`);
      
      return restoredTemplate;
    } catch (error) {
      console.error('Error restoring template version:', error);
      throw new Error('Failed to restore template version');
    }
  }

  /**
   * Export template for sharing
   */
  async exportTemplate(templateId: string): Promise<string> {
    try {
      const template = await this.getTemplateById(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      // Remove internal IDs and metadata for export
      const exportData = {
        ...template,
        id: undefined,
        createdAt: undefined,
        updatedAt: undefined,
        isCustom: undefined
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Error exporting template:', error);
      throw new Error('Failed to export template');
    }
  }

  /**
   * Import template from JSON
   */
  async importTemplate(templateJson: string, createdBy: string): Promise<CustomTemplate> {
    try {
      const templateData = JSON.parse(templateJson);
      
      // Validate template structure
      if (!templateData.code || !templateData.title || !templateData.fields) {
        throw new Error('Invalid template format');
      }

      // Ensure unique code
      const existingTemplates = this.getStoredTemplates();
      let code = templateData.code;
      let counter = 1;
      
      while (existingTemplates.some(t => t.code === code)) {
        code = `${templateData.code}_IMPORTED_${counter}`;
        counter++;
      }

      const importedTemplate = {
        ...templateData,
        code,
        createdBy
      };

      return await this.saveTemplate(importedTemplate);
    } catch (error) {
      console.error('Error importing template:', error);
      throw new Error('Failed to import template');
    }
  }

  /**
   * Search templates
   */
  async searchTemplates(query: string, filters?: {
    stage?: string;
    createdBy?: string;
    tags?: string[];
  }): Promise<CustomTemplate[]> {
    try {
      let templates = this.getStoredTemplates();

      // Apply text search
      if (query) {
        const searchLower = query.toLowerCase();
        templates = templates.filter(template => 
          template.title.toLowerCase().includes(searchLower) ||
          template.code.toLowerCase().includes(searchLower) ||
          template.stage.toLowerCase().includes(searchLower)
        );
      }

      // Apply filters
      if (filters) {
        if (filters.stage) {
          templates = templates.filter(t => t.stage === filters.stage);
        }
        
        if (filters.createdBy) {
          templates = templates.filter(t => t.createdBy === filters.createdBy);
        }
      }

      return templates;
    } catch (error) {
      console.error('Error searching templates:', error);
      return [];
    }
  }

  // Private helper methods
  private getStoredTemplates(): CustomTemplate[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error parsing stored templates:', error);
      return [];
    }
  }

  private getStoredVersions(): TemplateVersion[] {
    try {
      const stored = localStorage.getItem(this.versionsKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error parsing stored versions:', error);
      return [];
    }
  }

  private saveTemplateVersion(template: CustomTemplate, description?: string): void {
    try {
      const versions = this.getStoredVersions();
      const newVersion: TemplateVersion = {
        version: template.version,
        template: { ...template },
        createdAt: new Date().toISOString(),
        description
      };

      versions.push(newVersion);
      
      // Keep only last 10 versions per template
      const templateVersions = versions.filter(v => v.template.id === template.id);
      if (templateVersions.length > 10) {
        const filteredVersions = versions.filter(v => v.template.id !== template.id);
        const recentVersions = templateVersions
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 10);
        
        localStorage.setItem(this.versionsKey, JSON.stringify([...filteredVersions, ...recentVersions]));
      } else {
        localStorage.setItem(this.versionsKey, JSON.stringify(versions));
      }
    } catch (error) {
      console.error('Error saving template version:', error);
    }
  }

  private deleteTemplateVersions(templateId: string): void {
    try {
      const versions = this.getStoredVersions();
      const filteredVersions = versions.filter(v => v.template.id !== templateId);
      localStorage.setItem(this.versionsKey, JSON.stringify(filteredVersions));
    } catch (error) {
      console.error('Error deleting template versions:', error);
    }
  }

  private generateId(): string {
    return `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const customTemplatesService = new CustomTemplatesService();
export type { CustomTemplate, TemplateVersion };

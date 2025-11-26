/**
 * Task Templates Service
 * Manages task templates with stage scope and automation
 * Now stores templates in memory only - Supabase migration pending
 */

import { TaskTemplate, createDefaultTaskTemplate } from '@/types/taskTemplate';
import { GST_STAGES, GSTStage } from '../../config/appConfig';
import { toast } from 'sonner';

// Validation helper
const validateTemplate = (template: TaskTemplate): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!template.title || template.title.trim().length === 0) {
    errors.push('Title is required');
  }
  if (!template.category) {
    errors.push('Category is required');
  }
  if (template.estimatedHours <= 0) {
    errors.push('Estimated hours must be greater than 0');
  }
  if (!template.stageScope || template.stageScope.length === 0) {
    errors.push('At least one stage scope is required');
  }
  
  return { valid: errors.length === 0, errors };
};

class TaskTemplatesService {
  private templates: TaskTemplate[] = [];
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Initialize with default templates (in-memory only)
      await this.seedDefaultTemplates();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize task templates service:', error);
      await this.seedDefaultTemplates();
    }
  }

  async getAll(): Promise<TaskTemplate[]> {
    await this.initialize();
    return [...this.templates];
  }

  async getById(id: string): Promise<TaskTemplate | null> {
    await this.initialize();
    return this.templates.find(t => t.id === id) || null;
  }

  async getByStageScope(stage: GSTStage): Promise<TaskTemplate[]> {
    await this.initialize();
    return this.templates.filter(t => 
      t.stageScope.includes(stage) || t.stageScope.includes('Any Stage')
    );
  }

  async create(template: Partial<TaskTemplate>): Promise<TaskTemplate> {
    await this.initialize();
    
    const newTemplate = createDefaultTaskTemplate(template);
    const validation = validateTemplate(newTemplate);
    
    if (!validation.valid) {
      throw new Error(`Invalid template: ${validation.errors.join(', ')}`);
    }
    
    this.templates.push(newTemplate);
    await this.persist();
    
    toast.success('Task template created');
    return newTemplate;
  }

  async update(id: string, updates: Partial<TaskTemplate>): Promise<TaskTemplate> {
    await this.initialize();
    
    const index = this.templates.findIndex(t => t.id === id);
    if (index === -1) {
      throw new Error('Template not found');
    }
    
    const updated = { ...this.templates[index], ...updates, updatedAt: new Date().toISOString() };
    const validation = validateTemplate(updated);
    
    if (!validation.valid) {
      throw new Error(`Invalid template: ${validation.errors.join(', ')}`);
    }
    
    this.templates[index] = updated;
    await this.persist();
    
    toast.success('Task template updated');
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.initialize();
    
    const index = this.templates.findIndex(t => t.id === id);
    if (index === -1) {
      throw new Error('Template not found');
    }
    
    this.templates.splice(index, 1);
    await this.persist();
    
    toast.success('Task template deleted');
  }

  async incrementUsage(id: string): Promise<void> {
    await this.initialize();
    
    const template = this.templates.find(t => t.id === id);
    if (template) {
      template.usageCount = (template.usageCount || 0) + 1;
      await this.persist();
    }
  }

  // Additional methods for UI compatibility
  async clone(id: string): Promise<TaskTemplate> {
    await this.initialize();
    
    const template = this.templates.find(t => t.id === id);
    if (!template) {
      throw new Error('Template not found');
    }
    
    const cloned = createDefaultTaskTemplate({
      ...template,
      title: `${template.title} (Copy)`,
      usageCount: 0
    });
    
    this.templates.push(cloned);
    await this.persist();
    
    toast.success('Template cloned');
    return cloned;
  }

  getAvailableStages(): GSTStage[] {
    return GST_STAGES;
  }

  async getTemplateStats() {
    await this.initialize();
    
    return {
      total: this.templates.length,
      active: this.templates.filter(t => t.isActive).length,
      autoCreate: this.templates.filter(t => t.autoCreateOnStageChange).length,
      suggest: this.templates.filter(t => t.suggestOnStageChange).length
    };
  }

  private async persist(): Promise<void> {
    // In-memory only - persistence to Supabase pending
    console.log('[TaskTemplatesService] Templates stored in memory only');
  }

  private async seedDefaultTemplates(): Promise<void> {
    this.templates = [
      createDefaultTaskTemplate({
        title: 'Initial Case Assessment',
        description: 'Review case documents and assess initial complexity',
        category: 'Assessment',
        priority: 'High',
        estimatedHours: 2,
        stageScope: ['Any Stage' as GSTStage],
        suggestOnStageChange: true,
        autoCreateOnStageChange: false
      }),
      createDefaultTaskTemplate({
        title: 'Prepare Reply to Notice',
        description: 'Draft comprehensive reply addressing all points raised in the notice',
        category: 'Notice Reply',
        priority: 'High',
        estimatedHours: 8,
        stageScope: ['Any Stage' as GSTStage],
        suggestOnStageChange: true,
        autoCreateOnStageChange: false
      }),
      createDefaultTaskTemplate({
        title: 'Hearing Preparation',
        description: 'Prepare hearing documents, arguments, and strategy',
        category: 'Hearing',
        priority: 'High',
        estimatedHours: 4,
        stageScope: ['Any Stage' as GSTStage],
        suggestOnStageChange: true,
        autoCreateOnStageChange: false
      }),
      createDefaultTaskTemplate({
        title: 'Document Compilation',
        description: 'Compile and organize all case documents for submission',
        category: 'Documentation',
        priority: 'Medium',
        estimatedHours: 3,
        stageScope: ['Any Stage' as GSTStage],
        suggestOnStageChange: false,
        autoCreateOnStageChange: false
      }),
      createDefaultTaskTemplate({
        title: 'Appeal Filing',
        description: 'Prepare and file appeal to next appellate authority',
        category: 'Appeal',
        priority: 'High',
        estimatedHours: 6,
        stageScope: ['Any Stage' as GSTStage],
        suggestOnStageChange: true,
        autoCreateOnStageChange: false
      })
    ];
    
    await this.persist();
  }

  async export(): Promise<string> {
    await this.initialize();
    return JSON.stringify(this.templates, null, 2);
  }

  async import(jsonData: string): Promise<void> {
    try {
      const imported = JSON.parse(jsonData);
      if (!Array.isArray(imported)) {
        throw new Error('Invalid format: expected array of templates');
      }
      
      for (const template of imported) {
        const validation = validateTemplate(template);
        if (!validation.valid) {
          throw new Error(`Invalid template: ${validation.errors.join(', ')}`);
        }
      }
      
      this.templates = imported;
      this.initialized = true;
      await this.persist();
      
      toast.success(`Imported ${imported.length} templates`);
    } catch (error) {
      toast.error('Failed to import templates');
      throw error;
    }
  }
}

export const taskTemplatesService = new TaskTemplatesService();

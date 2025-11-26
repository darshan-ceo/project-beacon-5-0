/**
 * Task Templates Service
 * Manages task templates with stage scope and automation
 * Now stores templates in memory only - Supabase migration pending
 */

import { TaskTemplate, createDefaultTaskTemplate, validateTaskTemplate, TaskTemplateConditions } from '@/types/taskTemplate';
import { GST_STAGES, GSTStage } from '../../config/appConfig';
import { toast } from 'sonner';

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
    const validation = validateTaskTemplate(newTemplate);
    
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
    const validation = validateTaskTemplate(updated);
    
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
      template.lastUsed = new Date().toISOString();
      await this.persist();
    }
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
        stageScope: ['Assessment'],
        suggestOnStageChange: true,
        autoCreateOnStageChange: false
      }),
      createDefaultTaskTemplate({
        title: 'Prepare Reply to Notice',
        description: 'Draft comprehensive reply addressing all points raised in the notice',
        category: 'Notice Reply',
        priority: 'High',
        estimatedHours: 8,
        stageScope: ['Assessment', 'Adjudication'],
        suggestOnStageChange: true,
        autoCreateOnStageChange: false
      }),
      createDefaultTaskTemplate({
        title: 'Hearing Preparation',
        description: 'Prepare hearing documents, arguments, and strategy',
        category: 'Hearing',
        priority: 'High',
        estimatedHours: 4,
        stageScope: ['Adjudication', 'First Appeal', 'Tribunal', 'High Court'],
        suggestOnStageChange: true,
        autoCreateOnStageChange: false
      }),
      createDefaultTaskTemplate({
        title: 'Document Compilation',
        description: 'Compile and organize all case documents for submission',
        category: 'Documentation',
        priority: 'Medium',
        estimatedHours: 3,
        stageScope: ['Any Stage'],
        suggestOnStageChange: false,
        autoCreateOnStageChange: false
      }),
      createDefaultTaskTemplate({
        title: 'Appeal Filing',
        description: 'Prepare and file appeal to next appellate authority',
        category: 'Appeal',
        priority: 'High',
        estimatedHours: 6,
        stageScope: ['First Appeal', 'Tribunal', 'High Court'],
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
        const validation = validateTaskTemplate(template);
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

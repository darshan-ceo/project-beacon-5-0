/**
 * Task Templates Service
 * Manages task templates with stage scope and automation
 */

import { TaskTemplate, createDefaultTaskTemplate, validateTaskTemplate, TaskTemplateConditions } from '@/types/taskTemplate';
import { GST_STAGES, GSTStage } from '../../config/appConfig';
import { idbStorage } from '@/utils/idb';
import { toast } from 'sonner';

class TaskTemplatesService {
  private readonly STORAGE_KEY = 'task-templates';
  private templates: TaskTemplate[] = [];
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      const stored = await idbStorage.get(this.STORAGE_KEY);
      if (stored && Array.isArray(stored)) {
        this.templates = stored;
      } else {
        // Initialize with default templates
        await this.seedDefaultTemplates();
      }
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
    return this.templates.filter(template => 
      template.isActive && (
        template.stageScope.includes(stage) || 
        template.stageScope.includes('Any Stage')
      )
    );
  }

  async create(templateData: Partial<TaskTemplate>): Promise<TaskTemplate> {
    await this.initialize();
    
    const errors = validateTaskTemplate(templateData);
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    const template = createDefaultTaskTemplate({
      ...templateData,
      id: `template-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      usageCount: 0
    });

    this.templates.push(template);
    await this.persist();
    
    toast.success('Task template created successfully');
    return template;
  }

  async update(id: string, updates: Partial<TaskTemplate>): Promise<TaskTemplate> {
    await this.initialize();
    
    const index = this.templates.findIndex(t => t.id === id);
    if (index === -1) {
      throw new Error('Template not found');
    }

    const existing = this.templates[index];
    const updated = {
      ...existing,
      ...updates,
      id: existing.id, // Prevent ID changes
      updatedAt: new Date().toISOString(),
      version: existing.version + 1
    };

    const errors = validateTaskTemplate(updated);
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    this.templates[index] = updated;
    await this.persist();
    
    toast.success('Task template updated successfully');
    return updated;
  }

  async clone(id: string, nameOverride?: string): Promise<TaskTemplate> {
    await this.initialize();
    
    const original = await this.getById(id);
    if (!original) {
      throw new Error('Template not found');
    }

    const cloned = createDefaultTaskTemplate({
      ...original,
      id: `template-${Date.now()}`,
      title: nameOverride || `${original.title} — Copy`,
      usageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1
    });

    this.templates.push(cloned);
    await this.persist();
    
    toast.success('Task template cloned successfully');
    return cloned;
  }

  async delete(id: string): Promise<void> {
    await this.initialize();
    
    const index = this.templates.findIndex(t => t.id === id);
    if (index === -1) {
      throw new Error('Template not found');
    }

    this.templates.splice(index, 1);
    await this.persist();
    
    toast.success('Task template deleted successfully');
  }

  async incrementUsage(id: string): Promise<void> {
    await this.initialize();
    
    const template = this.templates.find(t => t.id === id);
    if (template) {
      template.usageCount++;
      template.updatedAt = new Date().toISOString();
      await this.persist();
    }
  }

  private async persist(): Promise<void> {
    try {
      await idbStorage.set(this.STORAGE_KEY, this.templates);
    } catch (error) {
      console.error('Failed to persist task templates:', error);
      throw new Error('Failed to save templates');
    }
  }

  private async seedDefaultTemplates(): Promise<void> {
    console.log('[TaskTemplatesService] Seeding default templates');
    
    const defaultTemplates: TaskTemplate[] = [
      createDefaultTaskTemplate({
        id: 'draft-response',
        title: 'Draft Response to Notice',
        description: 'Prepare comprehensive response addressing all points raised in the notice',
        estimatedHours: 16,
        priority: 'Critical',
        assignedRole: 'Senior Associate',
        category: 'Legal Drafting',
        stageScope: ['ASMT-10 Notice Received', 'DRC-01 SCN Received'],
        suggestOnStageChange: true,
        autoCreateOnStageChange: false,
        conditions: {
          noticeType: ['ASMT-10', 'DRC-01']
        },
        usageCount: 45
      }),
      
      createDefaultTaskTemplate({
        id: 'prepare-annexures',
        title: 'Prepare Supporting Annexures',
        description: 'Compile all required supporting documents and evidence',
        estimatedHours: 8,
        priority: 'High',
        assignedRole: 'Associate',
        category: 'Documentation',
        stageScope: ['ASMT-10 Reply Drafting', 'DRC-06 Reply Drafting'],
        suggestOnStageChange: true,
        autoCreateOnStageChange: true,
        dependencies: ['draft-response'],
        usageCount: 38
      }),
      
      createDefaultTaskTemplate({
        id: 'legal-review',
        title: 'Legal Review',
        description: 'Review legal arguments and ensure compliance with regulations',
        estimatedHours: 6,
        priority: 'High',
        assignedRole: 'Partner',
        category: 'Review',
        stageScope: ['Any Stage'],
        suggestOnStageChange: false,
        autoCreateOnStageChange: false,
        dependencies: ['draft-response'],
        usageCount: 52
      }),
      
      createDefaultTaskTemplate({
        id: 'client-approval',
        title: 'Client Approval',
        description: 'Obtain client approval for the prepared response',
        estimatedHours: 2,
        priority: 'Medium',
        assignedRole: 'Senior Associate',
        category: 'Client Management',
        stageScope: ['ASMT-10 Reply Drafting', 'DRC-06 Reply Drafting'],
        suggestOnStageChange: true,
        autoCreateOnStageChange: false,
        dependencies: ['legal-review'],
        usageCount: 41
      }),
      
      createDefaultTaskTemplate({
        id: 'file-response',
        title: 'File Response with Authority',
        description: 'Submit the approved response to the relevant tax authority',
        estimatedHours: 4,
        priority: 'High',
        assignedRole: 'Associate',
        category: 'Filing',
        stageScope: ['ASMT-10 Reply Filed', 'DRC-06 Reply Drafting'],
        suggestOnStageChange: false,
        autoCreateOnStageChange: true,
        dependencies: ['client-approval'],
        usageCount: 29
      }),
      
      createDefaultTaskTemplate({
        id: 'hearing-prep',
        title: 'Hearing Preparation',
        description: 'Prepare arguments and documentation for upcoming hearing',
        estimatedHours: 20,
        priority: 'Critical',
        assignedRole: 'Partner',
        category: 'Hearing Prep',
        stageScope: ['Hearing Scheduled'],
        suggestOnStageChange: true,
        autoCreateOnStageChange: true,
        usageCount: 18
      }),
      
      createDefaultTaskTemplate({
        id: 'precedent-research',
        title: 'Legal Precedent Research',
        description: 'Research relevant case law and legal precedents',
        estimatedHours: 14,
        priority: 'Medium',
        assignedRole: 'Team Lead',
        category: 'Research',
        stageScope: ['Appeal Filed – APL-01', 'Appeal Hearing'],
        suggestOnStageChange: true,
        autoCreateOnStageChange: false,
        usageCount: 26
      }),
      
      createDefaultTaskTemplate({
        id: 'evidence-compilation',
        title: 'Evidence Compilation',
        description: 'Compile and organize all evidence supporting the case',
        estimatedHours: 12,
        priority: 'Medium',
        assignedRole: 'Associate',
        category: 'Documentation',
        stageScope: ['Evidence / Additional Submission'],
        suggestOnStageChange: true,
        autoCreateOnStageChange: true,
        usageCount: 33
      })
    ];

    this.templates = defaultTemplates;
    await this.persist();
  }

  // Helper methods for UI
  getAvailableCategories(): string[] {
    return ['Legal Drafting', 'Documentation', 'Review', 'Client Management', 'Filing', 'Hearing Prep', 'Research', 'General'];
  }

  getAvailableRoles(): string[] {
    // Return default roles - actual roles should be fetched from employee master
    return ['Associate', 'Senior Associate', 'Partner', 'Senior Partner'];
  }

  getAvailableStages(): GSTStage[] {
    return [...GST_STAGES];
  }

  getTemplateStats() {
    return {
      total: this.templates.length,
      active: this.templates.filter(t => t.isActive).length,
      byCategory: this.templates.reduce((acc, template) => {
        acc[template.category] = (acc[template.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      avgHours: this.templates.length > 0 
        ? this.templates.reduce((sum, t) => sum + t.estimatedHours, 0) / this.templates.length 
        : 0,
      mostUsed: this.templates.sort((a, b) => b.usageCount - a.usageCount)[0]
    };
  }
}

export const taskTemplatesService = new TaskTemplatesService();
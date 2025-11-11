import { HearingOutcomeTemplate, OutcomeTaskTemplate, OUTCOME_TEMPLATES } from './hearingOutcomeTemplates';
import { toast } from '@/hooks/use-toast';

const STORAGE_KEY = 'custom_outcome_templates';

/**
 * Manager service for custom hearing outcome templates
 */
export class OutcomeTemplateManager {
  private customTemplates: HearingOutcomeTemplate[] = [];

  constructor() {
    this.loadCustomTemplates();
  }

  /**
   * Load custom templates from localStorage
   */
  private loadCustomTemplates(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.customTemplates = JSON.parse(stored);
      }
    } catch (error) {
      console.error('[OutcomeTemplateManager] Failed to load custom templates:', error);
      this.customTemplates = [];
    }
  }

  /**
   * Save custom templates to localStorage
   */
  private saveCustomTemplates(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.customTemplates));
    } catch (error) {
      console.error('[OutcomeTemplateManager] Failed to save custom templates:', error);
      throw error;
    }
  }

  /**
   * Get all templates (default + custom)
   */
  getAllTemplates(): HearingOutcomeTemplate[] {
    return [...OUTCOME_TEMPLATES, ...this.customTemplates];
  }

  /**
   * Get default templates only
   */
  getDefaultTemplates(): HearingOutcomeTemplate[] {
    return OUTCOME_TEMPLATES;
  }

  /**
   * Get custom templates only
   */
  getCustomTemplates(): HearingOutcomeTemplate[] {
    return this.customTemplates;
  }

  /**
   * Get template by outcome type
   */
  getTemplate(outcomeType: string): HearingOutcomeTemplate | null {
    const allTemplates = this.getAllTemplates();
    return allTemplates.find(t => t.outcomeType === outcomeType) || null;
  }

  /**
   * Check if a template is custom (vs default)
   */
  isCustomTemplate(outcomeType: string): boolean {
    return this.customTemplates.some(t => t.outcomeType === outcomeType);
  }

  /**
   * Create new custom template
   */
  createTemplate(template: HearingOutcomeTemplate): void {
    // Validate unique outcome type
    if (this.getTemplate(template.outcomeType)) {
      throw new Error(`Template with outcome type "${template.outcomeType}" already exists`);
    }

    this.customTemplates.push(template);
    this.saveCustomTemplates();

    toast({
      title: "Template Created",
      description: `Outcome template "${template.outcomeType}" has been created successfully`,
    });
  }

  /**
   * Update existing template (custom only)
   */
  updateTemplate(outcomeType: string, updates: Partial<HearingOutcomeTemplate>): void {
    const index = this.customTemplates.findIndex(t => t.outcomeType === outcomeType);
    
    if (index === -1) {
      throw new Error(`Custom template "${outcomeType}" not found. Cannot update default templates.`);
    }

    this.customTemplates[index] = {
      ...this.customTemplates[index],
      ...updates,
      outcomeType // Preserve original outcome type
    };

    this.saveCustomTemplates();

    toast({
      title: "Template Updated",
      description: `Outcome template "${outcomeType}" has been updated successfully`,
    });
  }

  /**
   * Clone default template to create custom version
   */
  cloneTemplate(outcomeType: string, newOutcomeType: string): void {
    const sourceTemplate = this.getTemplate(outcomeType);
    
    if (!sourceTemplate) {
      throw new Error(`Template "${outcomeType}" not found`);
    }

    if (this.getTemplate(newOutcomeType)) {
      throw new Error(`Template "${newOutcomeType}" already exists`);
    }

    const clonedTemplate: HearingOutcomeTemplate = {
      outcomeType: newOutcomeType,
      description: sourceTemplate.description,
      tasks: sourceTemplate.tasks.map(task => ({ ...task }))
    };

    this.customTemplates.push(clonedTemplate);
    this.saveCustomTemplates();

    toast({
      title: "Template Cloned",
      description: `Created new template "${newOutcomeType}" based on "${outcomeType}"`,
    });
  }

  /**
   * Delete custom template
   */
  deleteTemplate(outcomeType: string): void {
    if (!this.isCustomTemplate(outcomeType)) {
      throw new Error(`Cannot delete default template "${outcomeType}"`);
    }

    this.customTemplates = this.customTemplates.filter(t => t.outcomeType !== outcomeType);
    this.saveCustomTemplates();

    toast({
      title: "Template Deleted",
      description: `Outcome template "${outcomeType}" has been deleted`,
      variant: "destructive"
    });
  }

  /**
   * Add task to template
   */
  addTask(outcomeType: string, task: OutcomeTaskTemplate): void {
    const template = this.getTemplate(outcomeType);
    
    if (!template) {
      throw new Error(`Template "${outcomeType}" not found`);
    }

    if (!this.isCustomTemplate(outcomeType)) {
      throw new Error(`Cannot modify default template "${outcomeType}". Clone it first.`);
    }

    const index = this.customTemplates.findIndex(t => t.outcomeType === outcomeType);
    this.customTemplates[index].tasks.push(task);
    this.saveCustomTemplates();

    toast({
      title: "Task Added",
      description: `Task "${task.title}" added to template "${outcomeType}"`,
    });
  }

  /**
   * Update task in template
   */
  updateTask(outcomeType: string, taskIndex: number, updates: Partial<OutcomeTaskTemplate>): void {
    if (!this.isCustomTemplate(outcomeType)) {
      throw new Error(`Cannot modify default template "${outcomeType}". Clone it first.`);
    }

    const index = this.customTemplates.findIndex(t => t.outcomeType === outcomeType);
    
    if (index === -1) {
      throw new Error(`Template "${outcomeType}" not found`);
    }

    if (taskIndex < 0 || taskIndex >= this.customTemplates[index].tasks.length) {
      throw new Error(`Invalid task index ${taskIndex}`);
    }

    this.customTemplates[index].tasks[taskIndex] = {
      ...this.customTemplates[index].tasks[taskIndex],
      ...updates
    };

    this.saveCustomTemplates();

    toast({
      title: "Task Updated",
      description: "Task has been updated successfully",
    });
  }

  /**
   * Remove task from template
   */
  removeTask(outcomeType: string, taskIndex: number): void {
    if (!this.isCustomTemplate(outcomeType)) {
      throw new Error(`Cannot modify default template "${outcomeType}". Clone it first.`);
    }

    const index = this.customTemplates.findIndex(t => t.outcomeType === outcomeType);
    
    if (index === -1) {
      throw new Error(`Template "${outcomeType}" not found`);
    }

    if (taskIndex < 0 || taskIndex >= this.customTemplates[index].tasks.length) {
      throw new Error(`Invalid task index ${taskIndex}`);
    }

    const removedTask = this.customTemplates[index].tasks[taskIndex];
    this.customTemplates[index].tasks.splice(taskIndex, 1);
    this.saveCustomTemplates();

    toast({
      title: "Task Removed",
      description: `Task "${removedTask.title}" has been removed`,
      variant: "destructive"
    });
  }

  /**
   * Reorder tasks in template
   */
  reorderTasks(outcomeType: string, fromIndex: number, toIndex: number): void {
    if (!this.isCustomTemplate(outcomeType)) {
      throw new Error(`Cannot modify default template "${outcomeType}". Clone it first.`);
    }

    const index = this.customTemplates.findIndex(t => t.outcomeType === outcomeType);
    
    if (index === -1) {
      throw new Error(`Template "${outcomeType}" not found`);
    }

    const tasks = this.customTemplates[index].tasks;
    const [movedTask] = tasks.splice(fromIndex, 1);
    tasks.splice(toIndex, 0, movedTask);

    this.saveCustomTemplates();

    toast({
      title: "Tasks Reordered",
      description: "Task order has been updated",
    });
  }

  /**
   * Reset to default templates (clear all custom templates)
   */
  resetToDefaults(): void {
    this.customTemplates = [];
    this.saveCustomTemplates();

    toast({
      title: "Templates Reset",
      description: "All custom templates have been removed",
      variant: "destructive"
    });
  }

  /**
   * Export templates as JSON
   */
  exportTemplates(): string {
    return JSON.stringify(this.customTemplates, null, 2);
  }

  /**
   * Import templates from JSON
   */
  importTemplates(jsonString: string): void {
    try {
      const imported = JSON.parse(jsonString) as HearingOutcomeTemplate[];
      
      // Validate structure
      if (!Array.isArray(imported)) {
        throw new Error('Invalid template format: expected array');
      }

      for (const template of imported) {
        if (!template.outcomeType || !template.description || !Array.isArray(template.tasks)) {
          throw new Error('Invalid template structure');
        }
      }

      this.customTemplates = [...this.customTemplates, ...imported];
      this.saveCustomTemplates();

      toast({
        title: "Templates Imported",
        description: `Successfully imported ${imported.length} template(s)`,
      });
    } catch (error) {
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : 'Failed to import templates',
        variant: "destructive"
      });
      throw error;
    }
  }
}

// Singleton instance
export const outcomeTemplateManager = new OutcomeTemplateManager();

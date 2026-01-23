import { HearingOutcomeTemplate, OutcomeTaskTemplate, OUTCOME_TEMPLATES } from './hearingOutcomeTemplates';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

/**
 * Manager service for custom hearing outcome templates using Supabase
 */
export class OutcomeTemplateManager {
  private customTemplates: HearingOutcomeTemplate[] = [];
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
   * Initialize and load custom templates from Supabase
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      const tenantId = await this.getTenantId();
      
      const { data, error } = await supabase
        .from('custom_outcome_templates')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true);

      if (error) throw error;

      this.customTemplates = (data || []).map(row => ({
        outcomeType: row.outcome_type,
        description: row.description || '',
        tasks: (row.tasks as unknown as OutcomeTaskTemplate[]) || []
      }));

      this.initialized = true;
    } catch (error) {
      console.error('[OutcomeTemplateManager] Failed to load custom templates:', error);
      this.customTemplates = [];
      this.initialized = true;
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
  async createTemplate(template: HearingOutcomeTemplate): Promise<void> {
    if (this.getTemplate(template.outcomeType)) {
      throw new Error(`Template with outcome type "${template.outcomeType}" already exists`);
    }

    const tenantId = await this.getTenantId();

    const { error } = await supabase
      .from('custom_outcome_templates')
      .insert({
        tenant_id: tenantId,
        outcome_type: template.outcomeType,
        name: template.outcomeType,
        description: template.description,
        tasks: template.tasks as unknown as Json,
        is_active: true
      });

    if (error) throw error;

    this.customTemplates.push(template);

    toast({
      title: "Template Created",
      description: `Outcome template "${template.outcomeType}" has been created successfully`,
    });
  }

  /**
   * Update existing template (custom only)
   */
  async updateTemplate(outcomeType: string, updates: Partial<HearingOutcomeTemplate>): Promise<void> {
    const index = this.customTemplates.findIndex(t => t.outcomeType === outcomeType);
    
    if (index === -1) {
      throw new Error(`Custom template "${outcomeType}" not found. Cannot update default templates.`);
    }

    const tenantId = await this.getTenantId();

    const updateData: Record<string, any> = {};
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.tasks !== undefined) updateData.tasks = updates.tasks as unknown as Json;

    const { error } = await supabase
      .from('custom_outcome_templates')
      .update(updateData)
      .eq('tenant_id', tenantId)
      .eq('outcome_type', outcomeType);

    if (error) throw error;

    this.customTemplates[index] = {
      ...this.customTemplates[index],
      ...updates,
      outcomeType
    };

    toast({
      title: "Template Updated",
      description: `Outcome template "${outcomeType}" has been updated successfully`,
    });
  }

  /**
   * Clone default template to create custom version
   */
  async cloneTemplate(outcomeType: string, newOutcomeType: string): Promise<void> {
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

    await this.createTemplate(clonedTemplate);

    toast({
      title: "Template Cloned",
      description: `Created new template "${newOutcomeType}" based on "${outcomeType}"`,
    });
  }

  /**
   * Delete custom template
   */
  async deleteTemplate(outcomeType: string): Promise<void> {
    if (!this.isCustomTemplate(outcomeType)) {
      throw new Error(`Cannot delete default template "${outcomeType}"`);
    }

    const tenantId = await this.getTenantId();

    const { error } = await supabase
      .from('custom_outcome_templates')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('outcome_type', outcomeType);

    if (error) throw error;

    this.customTemplates = this.customTemplates.filter(t => t.outcomeType !== outcomeType);

    toast({
      title: "Template Deleted",
      description: `Outcome template "${outcomeType}" has been deleted`,
      variant: "destructive"
    });
  }

  /**
   * Add task to template
   */
  async addTask(outcomeType: string, task: OutcomeTaskTemplate): Promise<void> {
    const template = this.getTemplate(outcomeType);
    
    if (!template) {
      throw new Error(`Template "${outcomeType}" not found`);
    }

    if (!this.isCustomTemplate(outcomeType)) {
      throw new Error(`Cannot modify default template "${outcomeType}". Clone it first.`);
    }

    const index = this.customTemplates.findIndex(t => t.outcomeType === outcomeType);
    const updatedTasks = [...this.customTemplates[index].tasks, task];
    
    await this.updateTemplate(outcomeType, { tasks: updatedTasks });

    toast({
      title: "Task Added",
      description: `Task "${task.title}" added to template "${outcomeType}"`,
    });
  }

  /**
   * Update task in template
   */
  async updateTask(outcomeType: string, taskIndex: number, updates: Partial<OutcomeTaskTemplate>): Promise<void> {
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

    const updatedTasks = [...this.customTemplates[index].tasks];
    updatedTasks[taskIndex] = { ...updatedTasks[taskIndex], ...updates };

    await this.updateTemplate(outcomeType, { tasks: updatedTasks });

    toast({
      title: "Task Updated",
      description: "Task has been updated successfully",
    });
  }

  /**
   * Remove task from template
   */
  async removeTask(outcomeType: string, taskIndex: number): Promise<void> {
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
    const updatedTasks = this.customTemplates[index].tasks.filter((_, i) => i !== taskIndex);

    await this.updateTemplate(outcomeType, { tasks: updatedTasks });

    toast({
      title: "Task Removed",
      description: `Task "${removedTask.title}" has been removed`,
      variant: "destructive"
    });
  }

  /**
   * Reorder tasks in template
   */
  async reorderTasks(outcomeType: string, fromIndex: number, toIndex: number): Promise<void> {
    if (!this.isCustomTemplate(outcomeType)) {
      throw new Error(`Cannot modify default template "${outcomeType}". Clone it first.`);
    }

    const index = this.customTemplates.findIndex(t => t.outcomeType === outcomeType);
    
    if (index === -1) {
      throw new Error(`Template "${outcomeType}" not found`);
    }

    const tasks = [...this.customTemplates[index].tasks];
    const [movedTask] = tasks.splice(fromIndex, 1);
    tasks.splice(toIndex, 0, movedTask);

    await this.updateTemplate(outcomeType, { tasks });

    toast({
      title: "Tasks Reordered",
      description: "Task order has been updated",
    });
  }

  /**
   * Reset to default templates (clear all custom templates)
   */
  async resetToDefaults(): Promise<void> {
    const tenantId = await this.getTenantId();

    await supabase
      .from('custom_outcome_templates')
      .delete()
      .eq('tenant_id', tenantId);

    this.customTemplates = [];

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
  async importTemplates(jsonString: string): Promise<void> {
    try {
      const imported = JSON.parse(jsonString) as HearingOutcomeTemplate[];
      
      if (!Array.isArray(imported)) {
        throw new Error('Invalid template format: expected array');
      }

      for (const template of imported) {
        if (!template.outcomeType || !template.description || !Array.isArray(template.tasks)) {
          throw new Error('Invalid template structure');
        }
      }

      for (const template of imported) {
        if (!this.getTemplate(template.outcomeType)) {
          await this.createTemplate(template);
        }
      }

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

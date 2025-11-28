import { Case, Client, Signatory } from '../contexts/AppStateContext';
import { customTemplatesService } from './customTemplatesService';
import { normalizeStage } from '@/utils/stageUtils';

export interface FormField {
  key: string;
  label: string;
  type: 'string' | 'textarea' | 'date' | 'number' | 'array' | 'group' | 'boolean' | 'repeatable_group';
  required?: boolean;
  minLength?: number;
  minimum?: number;
  maximum?: number;
  default?: any;
  items?: {
    type: string;
  };
  fields?: FormField[];
  repeat_count_field?: string; // For repeatable groups
}

export interface FormTemplate {
  code: string;
  title: string;
  stage: string;
  version: string;
  prefill: Record<string, string>;
  fields: FormField[];
  output: {
    filename: string;
    dms_folder_by_stage: boolean;
    timeline_event: string;
  };
  customization?: {
    companyHeader?: string;
    companyFooter?: string;
  };
}

export interface FormValidationError {
  field: string;
  message: string;
}

class FormTemplatesService {
  private templates: Map<string, FormTemplate> = new Map();

  async loadFormTemplate(formCode: string): Promise<FormTemplate | null> {
    // Check cache first
    if (this.templates.has(formCode)) {
      return this.templates.get(formCode)!;
    }

    try {
      // First check custom templates (IndexedDB)
      const customTemplates = await customTemplatesService.getCustomTemplates();
      const customTemplate = customTemplates.find(t => t.code === formCode);
      
      if (customTemplate) {
        console.log(`[FormTemplates] Found custom template: ${formCode}`);
        this.templates.set(formCode, customTemplate);
        return customTemplate;
      }

      // Fall back to standard templates in public folder
      const response = await fetch(`/form-templates/${formCode}.json`);
      if (!response.ok) {
        console.error(`Failed to load form template: ${formCode}`);
        return null;
      }
      
      const template: FormTemplate = await response.json();
      this.templates.set(formCode, template);
      return template;
    } catch (error) {
      console.error(`Error loading form template ${formCode}:`, error);
      return null;
    }
  }

  // Stage to Template Mapping - Maps lifecycle stages to template codes
  private static LIFECYCLE_TO_TEMPLATE_MAPPING: Record<string, string[]> = {
    // Assessment stages
    'Assessment': ['ASMT10_REPLY', 'ASMT11_REPRESENTATION', 'ASMT13_REPLY', 'GST_REFUND_REPLY'],
    'Scrutiny': ['ASMT10_REPLY', 'ASMT11_REPRESENTATION', 'ASMT13_REPLY', 'GST_REFUND_REPLY'],
    
    // Adjudication stages  
    'Adjudication': ['DRC01_REPLY', 'DRC05_REPLY', 'DRC06_REPLY', 'DRC07_OBJECTION', 'DRC08_REPLY', 'DRC09_REPLY', 'DRC10_REPLY', 'ASMT12_REPLY'],
    'Demand': ['DRC01_REPLY', 'DRC02_REPLY', 'DRC03_REPLY', 'DRC04_REPLY', 'DRC07_OBJECTION'],
    
    // First Appeal
    'First Appeal': ['APPEAL_FIRST', 'APPEAL_SECOND', 'APPEAL_CROSS', 'APPEAL_RECTIFICATION'],
    'Appeals': ['APPEAL_FIRST', 'APPEAL_SECOND', 'APPEAL_CROSS', 'APPEAL_RECTIFICATION'],
    
    // Tribunal - all variants
    'Tribunal': ['GSTAT', 'GSTAT_STAY', 'GSTAT_MISC'],
    'GSTAT': ['GSTAT', 'GSTAT_STAY', 'GSTAT_MISC'],
    
    // High Court - all variants
    'High Court': ['HC_PETITION', 'HC_STAY', 'HC_INTERIM'],
    'HC': ['HC_PETITION', 'HC_STAY', 'HC_INTERIM'],
    
    // Supreme Court - all variants
    'Supreme Court': ['SC_SLP', 'SC_STAY', 'SC_REVIEW'],
    'SC': ['SC_SLP', 'SC_STAY', 'SC_REVIEW']
  };

  // Template Category to Lifecycle Stage Mapping - For display purposes
  private static TEMPLATE_TO_LIFECYCLE_MAPPING: Record<string, string> = {
    'Tribunal': 'GSTAT',
    'High Court': 'HC',
    'Supreme Court': 'SC'
  };

  getFormsByStage(stage: string, matterType?: string): string[] {
    // Normalize the stage to canonical form first
    const canonicalStage = normalizeStage(stage);
    
    // Try canonical stage match
    let templates = FormTemplatesService.LIFECYCLE_TO_TEMPLATE_MAPPING[canonicalStage];
    
    // If no templates found, try original stage (for backward compatibility)
    if (!templates || templates.length === 0) {
      templates = FormTemplatesService.LIFECYCLE_TO_TEMPLATE_MAPPING[stage];
    }
    
    // If still no templates and matterType provided, try matter type
    if ((!templates || templates.length === 0) && matterType) {
      templates = FormTemplatesService.LIFECYCLE_TO_TEMPLATE_MAPPING[matterType];
    }
    
    return templates || [];
  }

  getLifecycleStageFromTemplateCategory(templateCategory: string): string {
    return FormTemplatesService.TEMPLATE_TO_LIFECYCLE_MAPPING[templateCategory] || templateCategory;
  }

  validateFormData(template: FormTemplate, data: any): FormValidationError[] {
    const errors: FormValidationError[] = [];

    const validateField = (field: FormField, value: any, path: string = '') => {
      const fieldPath = path ? `${path}.${field.key}` : field.key;

      if (field.required && (value === undefined || value === null || value === '')) {
        errors.push({
          field: fieldPath,
          message: `${field.label} is required`
        });
        return;
      }

      if (value === undefined || value === null || value === '') {
        return;
      }

      switch (field.type) {
        case 'string':
          if (typeof value !== 'string') {
            errors.push({
              field: fieldPath,
              message: `${field.label} must be a string`
            });
          }
          break;

        case 'textarea':
          if (typeof value !== 'string') {
            errors.push({
              field: fieldPath,
              message: `${field.label} must be a string`
            });
          } else if (field.minLength && value.length < field.minLength) {
            errors.push({
              field: fieldPath,
              message: `${field.label} must be at least ${field.minLength} characters long`
            });
          }
          break;

        case 'number':
          if (typeof value !== 'number' || isNaN(value)) {
            errors.push({
              field: fieldPath,
              message: `${field.label} must be a valid number`
            });
          } else {
            if (field.minimum !== undefined && value < field.minimum) {
              errors.push({
                field: fieldPath,
                message: `${field.label} must be at least ${field.minimum}`
              });
            }
            if (field.maximum !== undefined && value > field.maximum) {
              errors.push({
                field: fieldPath,
                message: `${field.label} must be at most ${field.maximum}`
              });
            }
          }
          break;

        case 'date':
          if (!value || isNaN(Date.parse(value))) {
            errors.push({
              field: fieldPath,
              message: `${field.label} must be a valid date`
            });
          }
          break;

        case 'boolean':
          if (typeof value !== 'boolean') {
            errors.push({
              field: fieldPath,
              message: `${field.label} must be true or false`
            });
          }
          break;

        case 'array':
          if (!Array.isArray(value)) {
            errors.push({
              field: fieldPath,
              message: `${field.label} must be an array`
            });
          }
          break;

        case 'group':
          if (field.fields && typeof value === 'object') {
            field.fields.forEach(subField => {
              validateField(subField, value[subField.key], fieldPath);
            });
          }
          break;

        case 'repeatable_group':
          if (!Array.isArray(value)) {
            errors.push({
              field: fieldPath,
              message: `${field.label} must be an array`
            });
          } else if (field.fields) {
            value.forEach((item: any, index: number) => {
              field.fields!.forEach(subField => {
                validateField(subField, item[subField.key], `${fieldPath}[${index}]`);
              });
            });
          }
          break;
      }
    };

    template.fields.forEach(field => {
      validateField(field, data[field.key]);
    });

    return errors;
  }

  applyPrefillMappings(template: FormTemplate, caseData: Case, clientData: Client): Record<string, any> {
    const prefillData: Record<string, any> = {};

    Object.entries(template.prefill).forEach(([key, path]) => {
      const value = this.resolvePrefillValue(path, caseData, clientData);
      if (value !== undefined) {
        prefillData[key] = value;
      }
    });

    return prefillData;
  }

  private resolvePrefillValue(path: string, caseData: Case, clientData: Client): any {
    try {
      // Handle special cases
      if (path === 'now:YYYYMMDD') {
        return new Date().toISOString().slice(0, 10).replace(/-/g, '');
      }

      // Parse dot notation path
      const parts = path.split('.');
      let current: any = { case: caseData, client: clientData };

      for (const part of parts) {
        if (current && typeof current === 'object') {
          current = current[part];
        } else {
          return undefined;
        }
      }

      return current;
    } catch (error) {
      console.error(`Error resolving prefill path ${path}:`, error);
      return undefined;
    }
  }

  generateFilename(template: FormTemplate, caseData: Case): string {
    let filename = template.output.filename;
    
    // Replace placeholders
    filename = filename.replace('${case.id}', caseData.id);
    filename = filename.replace('${now:YYYYMMDD}', new Date().toISOString().slice(0, 10).replace(/-/g, ''));
    
    return filename;
  }

  async getAllTemplates(): Promise<FormTemplate[]> {
    const allFormCodes = [
      // Scrutiny
      'ASMT10_REPLY', 'ASMT11_REPRESENTATION', 'ASMT12_REPLY', 'ASMT13_REPLY', 'GST_REFUND_REPLY',
      // Demand
      'DRC01_REPLY', 'DRC02_REPLY', 'DRC03_REPLY', 'DRC04_REPLY', 'DRC07_OBJECTION',
      // Adjudication
      'DRC05_REPLY', 'DRC06_REPLY', 'DRC08_REPLY', 'DRC09_REPLY', 'DRC10_REPLY',
      // Appeals
      'APPEAL_FIRST', 'APPEAL_SECOND', 'APPEAL_CROSS', 'APPEAL_RECTIFICATION',
      // Tribunal
      'GSTAT', 'GSTAT_STAY', 'GSTAT_MISC',
      // High Court
      'HC_PETITION', 'HC_STAY', 'HC_INTERIM',
      // Supreme Court
      'SC_SLP', 'SC_STAY', 'SC_REVIEW'
    ];

    const templates: FormTemplate[] = [];
    
    for (const code of allFormCodes) {
      const template = await this.loadFormTemplate(code);
      if (template) {
        templates.push(template);
      }
    }

    return templates;
  }

  async getTemplatesByLifecycleStage(lifecycleStage: string, matterType?: string): Promise<FormTemplate[]> {
    const formCodes = this.getFormsByStage(lifecycleStage, matterType);
    const templates: FormTemplate[] = [];
    
    for (const code of formCodes) {
      const template = await this.loadFormTemplate(code);
      if (template) {
        templates.push(template);
      }
    }

    return templates;
  }
}

export const formTemplatesService = new FormTemplatesService();
import { Case, Client, Signatory } from '../contexts/AppStateContext';

export interface FormField {
  key: string;
  label: string;
  type: 'string' | 'textarea' | 'date' | 'number' | 'array' | 'group' | 'boolean';
  required?: boolean;
  minLength?: number;
  minimum?: number;
  maximum?: number;
  default?: any;
  items?: {
    type: string;
  };
  fields?: FormField[];
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
}

export interface FormValidationError {
  field: string;
  message: string;
}

class FormTemplatesService {
  private templates: Map<string, FormTemplate> = new Map();

  async loadFormTemplate(formCode: string): Promise<FormTemplate | null> {
    if (this.templates.has(formCode)) {
      return this.templates.get(formCode)!;
    }

    try {
      const response = await fetch(`/src/form-templates/${formCode}.json`);
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

  getFormsByStage(stage: string): string[] {
    const formsByStage: Record<string, string[]> = {
      'Scrutiny': ['ASMT10_REPLY', 'ASMT11_REPRESENTATION'],
      'Adjudication': ['ASMT12_REPLY'],
      'Demand': ['DRC01_REPLY', 'DRC07_OBJECTION'],
      'Appeals': ['APPEAL_FIRST'],
      'Tribunal': ['GSTAT'],
      'High Court': ['HC_PETITION'],
      'Supreme Court': ['SC_SLP']
    };

    return formsByStage[stage] || [];
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
      'ASMT10_REPLY', 'ASMT11_REPRESENTATION', 'ASMT12_REPLY',
      'DRC01_REPLY', 'DRC07_OBJECTION', 'APPEAL_FIRST',
      'GSTAT', 'HC_PETITION', 'SC_SLP'
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
}

export const formTemplatesService = new FormTemplatesService();
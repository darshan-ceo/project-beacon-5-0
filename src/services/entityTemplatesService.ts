/**
 * Entity Templates Service
 * Defines column templates and validation rules for each entity type
 */

import { EntityType, EntityTemplate, TemplateColumn, ValidationRule } from '@/types/importExport';

class EntityTemplatesService {
  private templates: Map<EntityType, EntityTemplate> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  private initializeTemplates() {
    // Court Master Template
    const courtTemplate: EntityTemplate = {
      entityType: 'court',
      columns: [
        {
          key: 'court_name',
          label: 'Court Name',
          isRequired: true,
          dataType: 'text',
          validationRules: [{ type: 'required', message: 'Court name is required' }],
          helpText: 'Full name of the court or tribunal',
          examples: ['Supreme Court of India', 'Delhi High Court', 'Sessions Court, Mumbai']
        },
        {
          key: 'court_type',
          label: 'Court Type',
          isRequired: false,
          dataType: 'select',
          validationRules: [],
          helpText: 'Type/category of court',
          examples: ['Supreme Court', 'High Court', 'District Court', 'Tribunal'],
          selectOptions: ['Supreme Court', 'High Court', 'District Court', 'Sessions Court', 'Magistrate Court', 'Tribunal', 'Commission']
        },
        {
          key: 'bench',
          label: 'Bench',
          isRequired: false,
          dataType: 'text',
          validationRules: [],
          helpText: 'Bench or division name',
          examples: ['Principal Bench', 'Circuit Bench', 'Division Bench']
        },
        {
          key: 'city',
          label: 'City',
          isRequired: true,
          dataType: 'text',
          validationRules: [{ type: 'required', message: 'City is required' }],
          helpText: 'City where court is located',
          examples: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai']
        },
        {
          key: 'district',
          label: 'District',
          isRequired: false,
          dataType: 'text',
          validationRules: [],
          helpText: 'District name',
          examples: ['Mumbai City', 'Central Delhi', 'Bangalore Urban']
        },
        {
          key: 'state_code',
          label: 'State Code',
          isRequired: true,
          dataType: 'select',
          validationRules: [{ type: 'required', message: 'State code is required' }],
          helpText: 'Two-letter state code',
          examples: ['MH', 'DL', 'KA', 'TN'],
          selectOptions: ['AN', 'AP', 'AR', 'AS', 'BR', 'CH', 'CT', 'DL', 'DN', 'GA', 'GJ', 'HR', 'HP', 'JK', 'JH', 'KA', 'KL', 'LD', 'MP', 'MH', 'MN', 'ML', 'MZ', 'NL', 'OR', 'PB', 'PY', 'RJ', 'SK', 'TN', 'TR', 'UP', 'UK', 'WB']
        },
        {
          key: 'state_name',
          label: 'State Name',
          isRequired: false,
          dataType: 'text',
          validationRules: [],
          helpText: 'Full state name',
          examples: ['Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu']
        },
        {
          key: 'country',
          label: 'Country',
          isRequired: false,
          dataType: 'text',
          validationRules: [],
          helpText: 'Country (default: India)',
          examples: ['India']
        },
        {
          key: 'pincode',
          label: 'Pincode',
          isRequired: false,
          dataType: 'text',
          validationRules: [{ type: 'pincode', message: 'Pincode must be 6 digits', pattern: '^\\d{6}$' }],
          helpText: '6-digit postal code',
          examples: ['400001', '110001', '560001']
        },
        {
          key: 'address_line1',
          label: 'Address Line 1',
          isRequired: true,
          dataType: 'text',
          validationRules: [{ type: 'required', message: 'Address line 1 is required' }],
          helpText: 'Primary address line',
          examples: ['High Court Building, Fort', 'Supreme Court Complex']
        },
        {
          key: 'address_line2',
          label: 'Address Line 2',
          isRequired: false,
          dataType: 'text',
          validationRules: [],
          helpText: 'Secondary address line',
          examples: ['Near Gateway of India', 'Tilak Marg Area']
        },
        {
          key: 'landmark',
          label: 'Landmark',
          isRequired: false,
          dataType: 'text',
          validationRules: [],
          helpText: 'Nearby landmark',
          examples: ['Near Metro Station', 'Opposite City Mall']
        },
        {
          key: 'courtroom',
          label: 'Courtroom',
          isRequired: false,
          dataType: 'text',
          validationRules: [],
          helpText: 'Default courtroom number',
          examples: ['Court No. 1', 'Hall A', 'Room 201']
        },
        {
          key: 'phone',
          label: 'Phone Number',
          isRequired: false,
          dataType: 'phone',
          validationRules: [{ type: 'phone', message: 'Invalid phone number format' }],
          helpText: 'Contact phone number',
          examples: ['+91 22 12345678', '011-23456789']
        },
        {
          key: 'email',
          label: 'Email',
          isRequired: false,
          dataType: 'email',
          validationRules: [{ type: 'email', message: 'Invalid email format' }],
          helpText: 'Official email address',
          examples: ['info@bombayhighcourt.nic.in', 'contact@delhihighcourt.nic.in']
        }
      ],
      upsertKeys: ['court_name', 'city'],
      addressFields: ['address_line1', 'address_line2', 'landmark', 'city', 'district', 'state_code', 'state_name', 'country', 'pincode']
    };

    // Client Master Template
    const clientTemplate: EntityTemplate = {
      entityType: 'client',
      columns: [
        {
          key: 'gstin',
          label: 'GSTIN',
          isRequired: false,
          dataType: 'text',
          validationRules: [{ type: 'gstin', message: 'Invalid GSTIN format' }],
          helpText: '15-character GST identification number',
          examples: ['22AAAAA0000A1Z5', '27AAAAA0000A1Z5']
        },
        {
          key: 'legal_name',
          label: 'Legal Name',
          isRequired: true,
          dataType: 'text',
          validationRules: [{ type: 'required', message: 'Legal name is required' }],
          helpText: 'Official registered name',
          examples: ['ABC Private Limited', 'XYZ Manufacturing Company']
        },
        {
          key: 'trade_name',
          label: 'Trade Name',
          isRequired: false,
          dataType: 'text',
          validationRules: [],
          helpText: 'Business/trading name',
          examples: ['ABC Corp', 'XYZ Industries']
        },
        {
          key: 'pan',
          label: 'PAN',
          isRequired: false,
          dataType: 'text',
          validationRules: [{ type: 'pan', message: 'Invalid PAN format', pattern: '^[A-Z]{5}[0-9]{4}[A-Z]{1}$' }],
          helpText: '10-character PAN number',
          examples: ['AAAAA1234A', 'BBBBB5678B']
        },
        {
          key: 'taxpayer_type',
          label: 'Taxpayer Type',
          isRequired: false,
          dataType: 'select',
          validationRules: [],
          helpText: 'Type of taxpayer as per GST',
          examples: ['Regular', 'Composition', 'SEZ'],
          selectOptions: ['Regular', 'Composition', 'SEZ', 'Deemed Export', 'EOU/EHTP/STP/BTP']
        },
        {
          key: 'constitution',
          label: 'Constitution',
          isRequired: false,
          dataType: 'select',
          validationRules: [],
          helpText: 'Business constitution type',
          examples: ['Private Limited Company', 'Partnership', 'Proprietorship'],
          selectOptions: ['Proprietorship', 'Partnership', 'LLP', 'Private Limited Company', 'Public Limited Company', 'Trust', 'Society', 'HUF']
        },
        {
          key: 'city',
          label: 'City',
          isRequired: true,
          dataType: 'text',
          validationRules: [{ type: 'required', message: 'City is required' }],
          helpText: 'City of business location',
          examples: ['Mumbai', 'Delhi', 'Bangalore']
        },
        {
          key: 'district',
          label: 'District',
          isRequired: false,
          dataType: 'text',
          validationRules: [],
          helpText: 'District name',
          examples: ['Mumbai City', 'Central Delhi']
        },
        {
          key: 'state_code',
          label: 'State Code',
          isRequired: true,
          dataType: 'select',
          validationRules: [{ type: 'required', message: 'State code is required' }],
          helpText: 'Two-letter state code',
          examples: ['MH', 'DL', 'KA'],
          selectOptions: ['AN', 'AP', 'AR', 'AS', 'BR', 'CH', 'CT', 'DL', 'DN', 'GA', 'GJ', 'HR', 'HP', 'JK', 'JH', 'KA', 'KL', 'LD', 'MP', 'MH', 'MN', 'ML', 'MZ', 'NL', 'OR', 'PB', 'PY', 'RJ', 'SK', 'TN', 'TR', 'UP', 'UK', 'WB']
        },
        {
          key: 'state_name',
          label: 'State Name',
          isRequired: false,
          dataType: 'text',
          validationRules: [],
          helpText: 'Full state name',
          examples: ['Maharashtra', 'Delhi', 'Karnataka']
        },
        {
          key: 'country',
          label: 'Country',
          isRequired: false,
          dataType: 'text',
          validationRules: [],
          helpText: 'Country (default: India)',
          examples: ['India']
        },
        {
          key: 'pincode',
          label: 'Pincode',
          isRequired: false,
          dataType: 'text',
          validationRules: [{ type: 'pincode', message: 'Pincode must be 6 digits', pattern: '^\\d{6}$' }],
          helpText: '6-digit postal code',
          examples: ['400001', '110001']
        },
        {
          key: 'address_line1',
          label: 'Address Line 1',
          isRequired: true,
          dataType: 'text',
          validationRules: [{ type: 'required', message: 'Address line 1 is required' }],
          helpText: 'Primary address line',
          examples: ['123 Business Center', 'Plot No. 45, Industrial Area']
        },
        {
          key: 'address_line2',
          label: 'Address Line 2',
          isRequired: false,
          dataType: 'text',
          validationRules: [],
          helpText: 'Secondary address line',
          examples: ['Near Metro Station', 'Sector 5']
        },
        {
          key: 'landmark',
          label: 'Landmark',
          isRequired: false,
          dataType: 'text',
          validationRules: [],
          helpText: 'Nearby landmark',
          examples: ['Opposite Shopping Mall', 'Behind Railway Station']
        },
        {
          key: 'primary_contact_name',
          label: 'Primary Contact Name',
          isRequired: false,
          dataType: 'text',
          validationRules: [],
          helpText: 'Name of primary contact person',
          examples: ['Mr. John Doe', 'Ms. Jane Smith']
        },
        {
          key: 'primary_contact_email',
          label: 'Primary Contact Email',
          isRequired: false,
          dataType: 'email',
          validationRules: [{ type: 'email', message: 'Invalid email format' }],
          helpText: 'Email of primary contact',
          examples: ['john.doe@company.com', 'contact@business.in']
        },
        {
          key: 'primary_contact_mobile',
          label: 'Primary Contact Mobile',
          isRequired: false,
          dataType: 'phone',
          validationRules: [{ type: 'phone', message: 'Invalid mobile number format' }],
          helpText: 'Mobile number of primary contact',
          examples: ['+91 9876543210', '9876543210']
        }
      ],
      upsertKeys: ['gstin', 'legal_name', 'city'],
      addressFields: ['address_line1', 'address_line2', 'landmark', 'city', 'district', 'state_code', 'state_name', 'country', 'pincode']
    };

    // Judge Master Template
    const judgeTemplate: EntityTemplate = {
      entityType: 'judge',
      columns: [
        {
          key: 'judge_name',
          label: 'Judge Name',
          isRequired: true,
          dataType: 'text',
          validationRules: [{ type: 'required', message: 'Judge name is required' }],
          helpText: 'Full name with title',
          examples: ['Hon\'ble Mr. Justice ABC', 'Hon\'ble Ms. Justice XYZ']
        },
        {
          key: 'designation',
          label: 'Designation',
          isRequired: false,
          dataType: 'select',
          validationRules: [],
          helpText: 'Official designation',
          examples: ['Chief Justice', 'Judge', 'Additional Judge'],
          selectOptions: ['Chief Justice', 'Judge', 'Additional Judge', 'District Judge', 'Additional District Judge', 'Chief Judicial Magistrate', 'Judicial Magistrate', 'Metropolitan Magistrate']
        },
        {
          key: 'court_name',
          label: 'Court Name',
          isRequired: true,
          dataType: 'text',
          validationRules: [{ type: 'required', message: 'Court name is required' }],
          helpText: 'Name of the court where judge serves',
          examples: ['Delhi High Court', 'District Court, Mumbai']
        },
        {
          key: 'bench',
          label: 'Bench',
          isRequired: false,
          dataType: 'text',
          validationRules: [],
          helpText: 'Bench or division',
          examples: ['Division Bench', 'Single Bench', 'Principal Bench']
        },
        {
          key: 'city',
          label: 'City',
          isRequired: true,
          dataType: 'text',
          validationRules: [{ type: 'required', message: 'City is required' }],
          helpText: 'City where court is located',
          examples: ['Delhi', 'Mumbai', 'Bangalore']
        },
        {
          key: 'state_code',
          label: 'State Code',
          isRequired: true,
          dataType: 'select',
          validationRules: [{ type: 'required', message: 'State code is required' }],
          helpText: 'Two-letter state code',
          examples: ['DL', 'MH', 'KA'],
          selectOptions: ['AN', 'AP', 'AR', 'AS', 'BR', 'CH', 'CT', 'DL', 'DN', 'GA', 'GJ', 'HR', 'HP', 'JK', 'JH', 'KA', 'KL', 'LD', 'MP', 'MH', 'MN', 'ML', 'MZ', 'NL', 'OR', 'PB', 'PY', 'RJ', 'SK', 'TN', 'TR', 'UP', 'UK', 'WB']
        },
        {
          key: 'email',
          label: 'Email',
          isRequired: false,
          dataType: 'email',
          validationRules: [{ type: 'email', message: 'Invalid email format' }],
          helpText: 'Official email address',
          examples: ['judge@court.nic.in', 'chambers@highcourt.in']
        },
        {
          key: 'phone',
          label: 'Phone',
          isRequired: false,
          dataType: 'phone',
          validationRules: [{ type: 'phone', message: 'Invalid phone number format' }],
          helpText: 'Contact phone number',
          examples: ['+91 11 23456789', '022-12345678']
        },
        {
          key: 'address_line1',
          label: 'Address Line 1',
          isRequired: false,
          dataType: 'text',
          validationRules: [],
          helpText: 'Primary address line',
          examples: ['Judge Chambers, High Court', 'Room No. 101']
        },
        {
          key: 'address_line2',
          label: 'Address Line 2',
          isRequired: false,
          dataType: 'text',
          validationRules: [],
          helpText: 'Secondary address line',
          examples: ['Court Complex', 'Administrative Block']
        },
        {
          key: 'landmark',
          label: 'Landmark',
          isRequired: false,
          dataType: 'text',
          validationRules: [],
          helpText: 'Nearby landmark',
          examples: ['Near Supreme Court', 'Civil Lines Area']
        },
        {
          key: 'district',
          label: 'District',
          isRequired: false,
          dataType: 'text',
          validationRules: [],
          helpText: 'District name',
          examples: ['Central Delhi', 'Mumbai City']
        },
        {
          key: 'pincode',
          label: 'Pincode',
          isRequired: false,
          dataType: 'text',
          validationRules: [{ type: 'pincode', message: 'Pincode must be 6 digits', pattern: '^\\d{6}$' }],
          helpText: '6-digit postal code',
          examples: ['110001', '400001']
        }
      ],
      upsertKeys: ['judge_name', 'court_name'],
      addressFields: ['address_line1', 'address_line2', 'landmark', 'city', 'district', 'state_code', 'pincode']
    };

    // Employee Master Template
    const employeeTemplate: EntityTemplate = {
      entityType: 'employee',
      columns: [
        {
          key: 'employee_code',
          label: 'Employee Code',
          isRequired: true,
          dataType: 'text',
          validationRules: [{ type: 'required', message: 'Employee code is required' }],
          helpText: 'Unique employee identifier',
          examples: ['EMP001', 'STAFF2023001', 'ADV001']
        },
        {
          key: 'full_name',
          label: 'Full Name',
          isRequired: true,
          dataType: 'text',
          validationRules: [{ type: 'required', message: 'Full name is required' }],
          helpText: 'Complete name of employee',
          examples: ['Mr. John Doe', 'Ms. Jane Smith', 'Dr. ABC Advocate']
        },
        {
          key: 'designation',
          label: 'Designation',
          isRequired: true,
          dataType: 'select',
          validationRules: [{ type: 'required', message: 'Designation is required' }],
          helpText: 'Job title or role',
          examples: ['Senior Advocate', 'Junior Associate', 'Legal Executive'],
          selectOptions: ['Partner', 'Senior Partner', 'Senior Advocate', 'Advocate', 'Junior Associate', 'Legal Executive', 'Paralegal', 'Secretary', 'Clerk', 'Administrator', 'Manager', 'Assistant Manager']
        },
        {
          key: 'dept',
          label: 'Department',
          isRequired: false,
          dataType: 'select',
          validationRules: [],
          helpText: 'Department or practice area',
          examples: ['Corporate Law', 'Litigation', 'Tax', 'Administration'],
          selectOptions: ['Corporate Law', 'Litigation', 'Tax Law', 'Criminal Law', 'Family Law', 'Real Estate', 'IPR', 'Banking & Finance', 'Administration', 'HR', 'Accounts', 'IT Support']
        },
        {
          key: 'work_email',
          label: 'Work Email',
          isRequired: true,
          dataType: 'email',
          validationRules: [
            { type: 'required', message: 'Work email is required' },
            { type: 'email', message: 'Invalid email format' }
          ],
          helpText: 'Official email address',
          examples: ['john.doe@lawfirm.com', 'jane@advocates.in']
        },
        {
          key: 'work_mobile',
          label: 'Work Mobile',
          isRequired: false,
          dataType: 'phone',
          validationRules: [{ type: 'phone', message: 'Invalid mobile number format' }],
          helpText: 'Official mobile number',
          examples: ['+91 9876543210', '9876543210']
        },
        {
          key: 'city',
          label: 'City',
          isRequired: false,
          dataType: 'text',
          validationRules: [],
          helpText: 'City of residence',
          examples: ['Mumbai', 'Delhi', 'Bangalore']
        },
        {
          key: 'state_code',
          label: 'State Code',
          isRequired: false,
          dataType: 'select',
          validationRules: [],
          helpText: 'Two-letter state code',
          examples: ['MH', 'DL', 'KA'],
          selectOptions: ['AN', 'AP', 'AR', 'AS', 'BR', 'CH', 'CT', 'DL', 'DN', 'GA', 'GJ', 'HR', 'HP', 'JK', 'JH', 'KA', 'KL', 'LD', 'MP', 'MH', 'MN', 'ML', 'MZ', 'NL', 'OR', 'PB', 'PY', 'RJ', 'SK', 'TN', 'TR', 'UP', 'UK', 'WB']
        },
        {
          key: 'address_line1',
          label: 'Address Line 1',
          isRequired: false,
          dataType: 'text',
          validationRules: [],
          helpText: 'Primary address line',
          examples: ['Flat 123, ABC Apartments', 'House No. 45, XYZ Colony']
        },
        {
          key: 'address_line2',
          label: 'Address Line 2',
          isRequired: false,
          dataType: 'text',
          validationRules: [],
          helpText: 'Secondary address line',
          examples: ['Sector 15', 'Near Shopping Complex']
        },
        {
          key: 'landmark',
          label: 'Landmark',
          isRequired: false,
          dataType: 'text',
          validationRules: [],
          helpText: 'Nearby landmark',
          examples: ['Opposite Bank', 'Behind School']
        },
        {
          key: 'district',
          label: 'District',
          isRequired: false,
          dataType: 'text',
          validationRules: [],
          helpText: 'District name',
          examples: ['Mumbai Suburban', 'South Delhi']
        },
        {
          key: 'pincode',
          label: 'Pincode',
          isRequired: false,
          dataType: 'text',
          validationRules: [{ type: 'pincode', message: 'Pincode must be 6 digits', pattern: '^\\d{6}$' }],
          helpText: '6-digit postal code',
          examples: ['400001', '110001']
        }
      ],
      upsertKeys: ['employee_code'],
      addressFields: ['address_line1', 'address_line2', 'landmark', 'city', 'district', 'state_code', 'pincode']
    };

    this.templates.set('court', courtTemplate);
    this.templates.set('client', clientTemplate);
    this.templates.set('judge', judgeTemplate);
    this.templates.set('employee', employeeTemplate);
  }

  /**
   * Get template for specified entity type
   */
  getTemplate(entityType: EntityType): EntityTemplate {
    const template = this.templates.get(entityType);
    if (!template) {
      throw new Error(`Template not found for entity type: ${entityType}`);
    }
    return template;
  }

  /**
   * Get all available templates
   */
  getAllTemplates(): EntityTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Validate data against template
   */
  validateData(entityType: EntityType, data: Record<string, any>): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const template = this.getTemplate(entityType);
    const errors: string[] = [];
    const warnings: string[] = [];

    template.columns.forEach(column => {
      const value = data[column.key];

      // Check required fields
      if (column.isRequired && (!value || value.toString().trim() === '')) {
        errors.push(`${column.label} is required`);
        return;
      }

      // Skip validation if value is empty and not required
      if (!value || value.toString().trim() === '') {
        return;
      }

      // Apply validation rules
      column.validationRules.forEach(rule => {
        switch (rule.type) {
          case 'email':
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
              errors.push(`${column.label}: ${rule.message}`);
            }
            break;
          case 'phone':
            if (!/^[+]?[\d\s-()]{10,15}$/.test(value.toString().replace(/\s/g, ''))) {
              errors.push(`${column.label}: ${rule.message}`);
            }
            break;
          case 'pincode':
            if (!/^\d{6}$/.test(value)) {
              errors.push(`${column.label}: ${rule.message}`);
            }
            break;
          case 'gstin':
            if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(value)) {
              errors.push(`${column.label}: ${rule.message}`);
            }
            break;
          case 'pan':
            if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value)) {
              errors.push(`${column.label}: ${rule.message}`);
            }
            break;
          case 'custom':
            if (rule.pattern && !new RegExp(rule.pattern).test(value)) {
              errors.push(`${column.label}: ${rule.message}`);
            }
            break;
        }
      });
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

export const entityTemplatesService = new EntityTemplatesService();
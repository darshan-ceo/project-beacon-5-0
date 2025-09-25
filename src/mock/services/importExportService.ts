/**
 * Import/Export Service - DEMO mode implementation with strict validation
 */

import { unifiedStore } from '@/persistence/unifiedStore';
import type { 
  ImportExportService, 
  ImportOptions, 
  ImportResult, 
  ExportOptions, 
  ApiResponse 
} from '@/mock/apiContracts';
import { demoConfig } from '@/config/demoConfig';
import { serviceRegistry } from './index';

class ImportExportServiceImpl implements ImportExportService {
  // Entity type detection patterns
  private entityPatterns = {
    clients: ['name', 'gstin', 'pan', 'type'],
    cases: ['caseNumber', 'title', 'clientId', 'currentStage'],
    tasks: ['title', 'description', 'caseId', 'priority'],
    courts: ['name', 'type', 'jurisdiction'],
    judges: ['name', 'designation', 'courtId'],
    employees: ['full_name', 'role', 'email', 'department'],
    hearings: ['case_id', 'date', 'court_id'],
    documents: ['name', 'type', 'caseId']
  };

  async import<T>(entity: string, data: any[], options: ImportOptions): Promise<ApiResponse<ImportResult>> {
    try {
      demoConfig.assertDemoMode();
      await demoConfig.simulateDelay();

      // Validate entity type
      const detectedEntity = this.detectEntityType(data[0]);
      if (detectedEntity !== entity) {
        return {
          success: false,
          error: `Entity type mismatch. Expected ${entity}, detected ${detectedEntity}. Please use the correct import template.`
        };
      }

      // Validate data structure
      const validation = await this.validateImport(entity, data);
      if (!validation.success || !validation.data?.valid) {
        return {
          success: false,
          error: `Data validation failed: ${validation.data?.errors.join(', ')}`
        };
      }

      if (options.validateOnly) {
        return {
          success: true,
          data: {
            success: true,
            imported: 0,
            skipped: 0,
            errors: [],
            warnings: []
          }
        };
      }

      const result: ImportResult = {
        success: true,
        imported: 0,
        skipped: 0,
        errors: [],
        warnings: []
      };

      // Process each record based on conflict policy
      for (const record of data) {
        try {
          const existingRecord = await this.findExistingRecord(entity, record);
          
          if (existingRecord) {
            switch (options.conflictPolicy) {
              case 'skip':
                result.skipped++;
                break;
              case 'merge':
                await this.updateRecord(entity, existingRecord.id, record);
                result.imported++;
                break;
              case 'create_new':
                await this.createRecord(entity, { ...record, id: undefined });
                result.imported++;
                break;
            }
          } else {
            await this.createRecord(entity, record);
            result.imported++;
          }
        } catch (error) {
          result.errors.push(`Row ${data.indexOf(record) + 1}: ${(error as Error).message}`);
        }
      }

      return {
        success: true,
        data: result,
        message: `Import completed: ${result.imported} imported, ${result.skipped} skipped, ${result.errors.length} errors`
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Import Data');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async export<T>(entity: string, data: T[], options: ExportOptions): Promise<ApiResponse<string>> {
    try {
      demoConfig.assertDemoMode();
      await demoConfig.simulateDelay();

      if (!data || data.length === 0) {
        return {
          success: false,
          error: 'No data to export'
        };
      }

      let exportData = data;

      // Filter fields if specified
      if (options.selectedFields && options.selectedFields.length > 0) {
        exportData = data.map(item => {
          const filtered: any = {};
          options.selectedFields!.forEach(field => {
            if (field in (item as any)) {
              filtered[field] = (item as any)[field];
            }
          });
          return filtered;
        });
      }

      let result: string;

      switch (options.format) {
        case 'csv':
          result = this.convertToCSV(exportData, options.includeHeaders);
          break;
        case 'json':
          result = JSON.stringify(exportData, null, 2);
          break;
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }

      return {
        success: true,
        data: result,
        message: `Exported ${exportData.length} records as ${options.format.toUpperCase()}`
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Export Data');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async validateImport(entity: string, data: any[]): Promise<ApiResponse<{ valid: boolean; errors: string[] }>> {
    try {
      demoConfig.assertDemoMode();

      const errors: string[] = [];

      if (!data || data.length === 0) {
        errors.push('No data provided');
      }

      // Check entity type detection
      if (data.length > 0) {
        const detectedEntity = this.detectEntityType(data[0]);
        if (detectedEntity !== entity) {
          errors.push(`Entity type mismatch. Expected ${entity}, detected ${detectedEntity}`);
        }
      }

      // Validate required fields for each record
      data.forEach((record, index) => {
        const recordErrors = this.validateRecord(entity, record);
        recordErrors.forEach(error => {
          errors.push(`Row ${index + 1}: ${error}`);
        });
      });

      return {
        success: true,
        data: {
          valid: errors.length === 0,
          errors
        }
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  private detectEntityType(record: any): string {
    if (!record) return 'unknown';

    let bestMatch = 'unknown';
    let maxScore = 0;

    Object.entries(this.entityPatterns).forEach(([entityType, patterns]) => {
      const score = patterns.reduce((acc, pattern) => {
        return acc + (pattern in record ? 1 : 0);
      }, 0);

      if (score > maxScore) {
        maxScore = score;
        bestMatch = entityType;
      }
    });

    return bestMatch;
  }

  private validateRecord(entity: string, record: any): string[] {
    const errors: string[] = [];
    const patterns = this.entityPatterns[entity as keyof typeof this.entityPatterns];

    if (!patterns) {
      errors.push(`Unknown entity type: ${entity}`);
      return errors;
    }

    // Check required fields (basic validation)
    patterns.forEach(field => {
      if (!(field in record) || !record[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    });

    // Entity-specific validation
    switch (entity) {
      case 'clients':
        if (record.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(record.pan)) {
          errors.push('Invalid PAN format');
        }
        if (record.gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(record.gstin)) {
          errors.push('Invalid GSTIN format');
        }
        break;
      case 'employees':
        if (record.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email)) {
          errors.push('Invalid email format');
        }
        break;
    }

    return errors;
  }

  private async findExistingRecord(entity: string, record: any): Promise<any> {
    try {
      const service = serviceRegistry[entity as keyof typeof serviceRegistry];
      const allRecords = await service.getAll();
      
      if (!allRecords.success || !allRecords.data) {
        return null;
      }

      // Find by unique identifiers
      switch (entity) {
        case 'clients':
          return allRecords.data.find((item: any) => 
            item.pan === record.pan || item.gstin === record.gstin
          );
        case 'cases':
          return allRecords.data.find((item: any) => 
            item.caseNumber === record.caseNumber
          );
        case 'employees':
          return allRecords.data.find((item: any) => 
            item.email === record.email
          );
        default:
          return allRecords.data.find((item: any) => 
            item.name === record.name
          );
      }
    } catch (error) {
      return null;
    }
  }

  private async createRecord(entity: string, record: any): Promise<any> {
    const service = serviceRegistry[entity as keyof typeof serviceRegistry];
    return service.create(record);
  }

  private async updateRecord(entity: string, id: string, record: any): Promise<any> {
    const service = serviceRegistry[entity as keyof typeof serviceRegistry];
    return service.update(id, record);
  }

  private convertToCSV(data: any[], includeHeaders = true): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows: string[] = [];

    if (includeHeaders) {
      csvRows.push(headers.join(','));
    }

    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        // Escape quotes and wrap in quotes if contains comma or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value || '';
      });
      csvRows.push(values.join(','));
    });

    return csvRows.join('\n');
  }
}

export const importExportService = new ImportExportServiceImpl();
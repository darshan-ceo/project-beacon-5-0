/**
 * Client-Side Import/Export Service
 * Handles all import/export operations using client-side processing
 */

import * as XLSX from 'xlsx';
import { 
  EntityType, 
  ImportJob, 
  ExportJob, 
  ExportRequest, 
  ImportResponse, 
  ExportResponse, 
  TemplateResponse, 
  PendingRecord, 
  ColumnMapping 
} from '@/types/importExport';
import { entityTemplatesService } from './entityTemplatesService';
import { mappingService } from './mappingService';
import { importIntegrationService } from './importIntegrationService';

class ClientSideImportExportService {
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate and download template for specified entity type
   */
  async downloadTemplate(entityType: EntityType): Promise<TemplateResponse> {
    try {
      console.log('downloadTemplate called for:', entityType);
      
      // Check if entityType is valid
      if (!['court', 'client', 'judge', 'employee'].includes(entityType)) {
        throw new Error(`Invalid entity type: ${entityType}`);
      }
      
      const template = await entityTemplatesService.getTemplate(entityType);
      console.log('Template retrieved:', template);
      
      if (!template || !template.columns || template.columns.length === 0) {
        throw new Error(`No template found for entity type: ${entityType}`);
      }
      
      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Prepare headers and sample data
      const headers = template.columns.map(col => col.label);
      const sampleData = template.columns.map(col => col.examples && col.examples[0] ? col.examples[0] : 'Sample Data');
      
      console.log('Headers:', headers);
      console.log('Sample data:', sampleData);
      
      // Create worksheet with headers and sample row
      const wsData = [headers, sampleData];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      // Add comments/help text
      template.columns.forEach((col, index) => {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c: index });
        if (!ws[cellRef]) ws[cellRef] = { v: col.label };
        ws[cellRef].c = [{
          a: 'System',
          t: `${col.helpText}\nRequired: ${col.isRequired ? 'Yes' : 'No'}\nType: ${col.dataType}`
        }];
      });
      
      // Set column widths
      ws['!cols'] = template.columns.map(() => ({ wch: 20 }));
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, entityType.charAt(0).toUpperCase() + entityType.slice(1));
      
      // Generate blob with correct MIME type and buffer
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
      const blob = new Blob([wbout], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8' 
      });
      
      console.log('Template blob created successfully, size:', blob.size);
      return {
        success: true,
        data: blob
      };
    } catch (error) {
      console.error('Template generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Template generation failed'
      };
    }
  }

  /**
   * Process uploaded file and create import job
   */
  async uploadForImport(entityType: EntityType, file: File): Promise<ImportResponse> {
    try {
      // Read file
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (jsonData.length === 0) {
        throw new Error('File appears to be empty');
      }
      
      const headers = jsonData[0] as string[];
      // Filter out blank rows
      const rows = jsonData.slice(1).filter((row: any) => 
        Array.isArray(row) && row.some(cell => String(cell || '').trim() !== '')
      );
      
      // Create import job
      const job: ImportJob = {
        id: this.generateJobId(),
        entityType,
        fileName: file.name,
        fileSize: file.size,
        status: 'pending',
        userId: 'current_user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        counts: {
          total: rows.length,
          valid: 0,
          invalid: 0,
          processed: 0
        }
      };
      
      // Store job data in localStorage for mock persistence
      const jobData = {
        job,
        headers,
        rows
      };
      localStorage.setItem(`import_job_${job.id}`, JSON.stringify(jobData));
      
      return {
        success: true,
        data: job
      };
    } catch (error) {
      console.error('File upload failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'File upload failed'
      };
    }
  }

  /**
   * Get import job details
   */
  async getImportJob(jobId: string): Promise<{ success: boolean; data: ImportJob | null; error?: string }> {
    try {
      const jobData = localStorage.getItem(`import_job_${jobId}`);
      if (!jobData) {
        return {
          success: false,
          data: null,
          error: 'Import job not found'
        };
      }
      
      const { job } = JSON.parse(jobData);
      return {
        success: true,
        data: job
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to fetch import job'
      };
    }
  }

  /**
   * Validate import data without inserting to database
   * Used to show accurate counts in Preview step
   */
  async validateImportData(jobId: string, mapping: ColumnMapping): Promise<{
    success: boolean;
    validRecords: any[];
    invalidRecords: any[];
    errors: any[];
    error?: string;
  }> {
    try {
      const jobData = localStorage.getItem(`import_job_${jobId}`);
      if (!jobData) {
        return {
          success: false,
          validRecords: [],
          invalidRecords: [],
          errors: [],
          error: 'Import job not found'
        };
      }

      const { job, headers, rows } = JSON.parse(jobData);
      const template = await entityTemplatesService.getTemplate(job.entityType);
      const requiredFields = template.columns.filter(col => col.isRequired).map(col => col.key);

      const validRecords: any[] = [];
      const invalidRecords: any[] = [];
      const errors: any[] = [];

      rows.forEach((row: any[], rowIndex: number) => {
        const record: Record<string, any> = {};
        const rowErrors: string[] = [];

        // Map columns
        Object.entries(mapping).forEach(([templateKey, mapConfig]) => {
          if (mapConfig.sourceColumn) {
            const sourceIndex = headers.indexOf(mapConfig.sourceColumn);
            if (sourceIndex !== -1) {
              record[templateKey] = row[sourceIndex];
            }
          }
        });

        // Validate required fields
        requiredFields.forEach(field => {
          const value = record[field];
          if (!value || String(value).trim() === '') {
            rowErrors.push(`Missing required field: ${field}`);
          }
        });

        if (rowErrors.length === 0) {
          validRecords.push({ ...record, _rowIndex: rowIndex });
        } else {
          invalidRecords.push({ ...record, _rowIndex: rowIndex + 2 });
          errors.push({
            id: `error_${rowIndex}`,
            jobId,
            row: rowIndex + 2,
            column: '',
            value: '',
            error: rowErrors.join('; '),
            severity: 'error' as const,
            canAutoFix: false
          });
        }
      });

      return {
        success: true,
        validRecords,
        invalidRecords,
        errors
      };
    } catch (error) {
      return {
        success: false,
        validRecords: [],
        invalidRecords: [],
        errors: [],
        error: error instanceof Error ? error.message : 'Validation failed'
      };
    }
  }

  /**
   * Commit import job with mapping
   * Now uses pre-validated data from validateImportData()
   */
  async commitImport(jobId: string, mapping: ColumnMapping): Promise<{ success: boolean; data: ImportJob | null; error?: string }> {
    try {
      const jobData = localStorage.getItem(`import_job_${jobId}`);
      if (!jobData) {
        throw new Error('Import job not found');
      }
      
      const { job } = JSON.parse(jobData);
      
      // Get already-validated records from job
      const validRecords: any[] = [];
      const invalidRecords: any[] = [];
      const errors: any[] = [];

      // Re-run validation to get fresh data
      const validationResult = await this.validateImportData(jobId, mapping);
      if (!validationResult.success) {
        throw new Error(validationResult.error || 'Validation failed');
      }

      validRecords.push(...validationResult.validRecords);
      invalidRecords.push(...validationResult.invalidRecords);
      errors.push(...validationResult.errors);
      
      // Update processing status
      job.status = 'processing';
      job.mapping = mapping;
      job.updatedAt = new Date().toISOString();

      // Insert valid records into database
      let insertedCount = 0;
      const insertionErrors: Array<{ record: any; error: string }> = [];

      if (validRecords.length > 0) {
        try {
          const insertResult = await importIntegrationService.insertRecords(
            job.entityType,
            validRecords
          );
          
          insertedCount = insertResult.insertedCount;
          
          // Handle insertion errors
          if (insertResult.errors.length > 0) {
            insertResult.errors.forEach(err => {
              insertionErrors.push(err);
              // Move failed records from valid to invalid
              const failedIndex = validRecords.findIndex(r => r === err.record);
              if (failedIndex !== -1) {
                const failedRecord = validRecords.splice(failedIndex, 1)[0];
                invalidRecords.push(failedRecord);
                errors.push({
                  id: `insert_error_${invalidRecords.length}`,
                  jobId,
                  row: (failedRecord._rowIndex || 0) + 2,
                  column: '',
                  value: '',
                  error: `Database insertion failed: ${err.error}`,
                  severity: 'error' as const,
                  canAutoFix: false
                });
              }
            });
          }
        } catch (error) {
          console.error('Database insertion failed:', error);
          return {
            success: false,
            data: null,
            error: `Failed to insert records: ${error instanceof Error ? error.message : 'Unknown error'}`
          };
        }
      }

      // Store pending records for download
      if (invalidRecords.length > 0) {
        localStorage.setItem(`pending_records_${jobId}`, JSON.stringify(invalidRecords));
      }

      // Update job with actual insertion results
      job.status = 'completed';
      job.counts.processed = insertedCount;
      job.counts.valid = insertedCount;
      job.counts.invalid = invalidRecords.length;
      job.errors = errors;
      job.completedAt = new Date().toISOString();
      
      // Re-read job data to preserve headers and rows
      const currentJobData = localStorage.getItem(`import_job_${jobId}`);
      if (currentJobData) {
        const parsed = JSON.parse(currentJobData);
        localStorage.setItem(`import_job_${jobId}`, JSON.stringify({ ...parsed, job }));
      }
      
      // Trigger storage event to refresh Client Master list
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'clients',
        newValue: localStorage.getItem('clients')
      }));
      
      return {
        success: true,
        data: job
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to commit import'
      };
    }
  }

  /**
   * Get pending records for manual review
   */
  async getPendingRecords(jobId: string): Promise<{ success: boolean; data: PendingRecord[]; error?: string }> {
    try {
      const pendingStr = localStorage.getItem(`pending_records_${jobId}`);
      if (!pendingStr) {
        return { success: true, data: [] };
      }

      const pendingRecords = JSON.parse(pendingStr);
      return {
        success: true,
        data: pendingRecords.map((record: any, index: number) => ({
          id: `pending_${jobId}_${index}`,
          jobId,
          row: record._rowIndex || index + 2,
          originalData: record,
          errors: [
            {
              id: `error_${index}`,
              jobId,
              row: record._rowIndex || index + 2,
              column: '',
              value: '',
              error: 'Validation failed - missing required fields',
              severity: 'error' as const,
              canAutoFix: false
            }
          ],
          status: 'pending' as const
        }))
      };
    } catch (error) {
      console.error('Error getting pending records:', error);
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Failed to get pending records'
      };
    }
  }

  /**
   * Export data (mock implementation)
   */
  async exportData(request: ExportRequest): Promise<ExportResponse> {
    try {
      const job: ExportJob = {
        id: this.generateJobId(),
        entityType: request.entityType,
        format: request.format,
        status: 'processing',
        userId: request.userId,
        createdAt: new Date().toISOString(),
        filters: request.filters,
        recordCount: 100 // Mock record count
      };
      
      // Simulate processing delay
      setTimeout(() => {
        job.status = 'completed';
        job.completedAt = new Date().toISOString();
        job.fileUrl = `mock://export/${job.id}.${job.format}`;
        localStorage.setItem(`export_job_${job.id}`, JSON.stringify(job));
      }, 3000);
      
      localStorage.setItem(`export_job_${job.id}`, JSON.stringify(job));
      
      return {
        success: true,
        data: job
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed'
      };
    }
  }

  /**
   * Get export job status
   */
  async getExportJob(jobId: string): Promise<{ success: boolean; data: ExportJob | null; error?: string }> {
    try {
      const jobData = localStorage.getItem(`export_job_${jobId}`);
      if (!jobData) {
        return {
          success: false,
          data: null,
          error: 'Export job not found'
        };
      }
      
      return {
        success: true,
        data: JSON.parse(jobData)
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to fetch export job'
      };
    }
  }

  /**
   * Download export file (mock)
   */
  async downloadExport(jobId: string): Promise<TemplateResponse> {
    try {
      // Create a mock Excel file for export
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([
        ['Name', 'Email', 'Phone', 'City'],
        ['John Doe', 'john@example.com', '+91-9876543210', 'Mumbai'],
        ['Jane Smith', 'jane@example.com', '+91-9876543211', 'Delhi']
      ]);
      
      XLSX.utils.book_append_sheet(wb, ws, 'Export Data');
      
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
      const blob = new Blob([wbout], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8' 
      });
      
      return {
        success: true,
        data: blob
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Download failed'
      };
    }
  }
}

export const clientSideImportExportService = new ClientSideImportExportService();
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
      const rows = jsonData.slice(1);
      
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
   * Commit import job with mapping
   */
  async commitImport(jobId: string, mapping: ColumnMapping): Promise<{ success: boolean; data: ImportJob | null; error?: string }> {
    try {
      const jobData = localStorage.getItem(`import_job_${jobId}`);
      if (!jobData) {
        throw new Error('Import job not found');
      }
      
      const { job, headers, rows } = JSON.parse(jobData);
      
      // Simulate processing
      job.status = 'processing';
      job.mapping = mapping;
      job.updatedAt = new Date().toISOString();
      
      // Mock validation results
      const validRows = Math.floor(rows.length * 0.85); // 85% success rate
      job.counts.valid = validRows;
      job.counts.invalid = rows.length - validRows;
      job.counts.processed = rows.length;
      
      // After a delay, mark as completed
      setTimeout(() => {
        job.status = 'completed';
        localStorage.setItem(`import_job_${jobId}`, JSON.stringify({ job, headers, rows }));
      }, 2000);
      
      localStorage.setItem(`import_job_${jobId}`, JSON.stringify({ job, headers, rows }));
      
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
      const jobData = localStorage.getItem(`import_job_${jobId}`);
      if (!jobData) {
        throw new Error('Import job not found');
      }
      
      const { rows } = JSON.parse(jobData);
      
      // Mock some pending records with errors
      const pendingRecords: PendingRecord[] = rows.slice(0, 3).map((row: any[], index: number) => ({
        id: `pending_${jobId}_${index}`,
        jobId,
        row: index + 2, // +2 because row 1 is headers
        originalData: row.reduce((acc, val, i) => ({ ...acc, [`col_${i}`]: val }), {}),
        errors: [
          {
            id: `error_${index}`,
            jobId,
            row: index + 2,
            column: 'email',
            value: row[2] || '',
            error: 'Invalid email format',
            severity: 'error' as const,
            canAutoFix: true
          }
        ],
        status: 'pending' as const
      }));
      
      return {
        success: true,
        data: pendingRecords
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Failed to fetch pending records'
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
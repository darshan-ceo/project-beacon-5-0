/**
 * Client-Side Import/Export Service
 * Handles all import/export operations using client-side processing
 * Migrated to Supabase for job persistence (Phase 3)
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
import { DataJob } from '@/types/notification';
import { entityTemplatesService } from './entityTemplatesService';
import { importIntegrationService } from './importIntegrationService';
import { supabase } from '@/integrations/supabase/client';

class ClientSideImportExportService {
  /**
   * Get current user and tenant context
   */
  private async getContext(): Promise<{ userId: string; tenantId: string } | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile?.tenant_id) return null;

      return { userId: user.id, tenantId: profile.tenant_id };
    } catch (error) {
      console.error('getContext failed:', error);
      return null;
    }
  }

  /**
   * Generate and download template for specified entity type
   */
  async downloadTemplate(entityType: EntityType): Promise<TemplateResponse> {
    try {
      console.log('downloadTemplate called for:', entityType);
      
      if (!['court', 'client', 'judge', 'employee'].includes(entityType)) {
        throw new Error(`Invalid entity type: ${entityType}`);
      }
      
      const template = await entityTemplatesService.getTemplate(entityType);
      console.log('Template retrieved:', template);
      
      if (!template || !template.columns || template.columns.length === 0) {
        throw new Error(`No template found for entity type: ${entityType}`);
      }
      
      const wb = XLSX.utils.book_new();
      
      const headers = template.columns.map(col => col.label);
      const sampleData = template.columns.map(col => col.examples && col.examples[0] ? col.examples[0] : 'Sample Data');
      
      const wsData = [headers, sampleData];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      template.columns.forEach((col, index) => {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c: index });
        if (!ws[cellRef]) ws[cellRef] = { v: col.label };
        ws[cellRef].c = [{
          a: 'System',
          t: `${col.helpText}\nRequired: ${col.isRequired ? 'Yes' : 'No'}\nType: ${col.dataType}`
        }];
      });
      
      ws['!cols'] = template.columns.map(() => ({ wch: 20 }));
      XLSX.utils.book_append_sheet(wb, ws, entityType.charAt(0).toUpperCase() + entityType.slice(1));
      
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
      const blob = new Blob([wbout], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8' 
      });
      
      return { success: true, data: blob };
    } catch (error) {
      console.error('Template generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Template generation failed'
      };
    }
  }

  /**
   * Process uploaded file and create import job in Supabase
   */
  async uploadForImport(entityType: EntityType, file: File): Promise<ImportResponse> {
    try {
      const context = await this.getContext();
      if (!context) {
        throw new Error('Not authenticated');
      }

      // Read file
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (jsonData.length === 0) {
        throw new Error('File appears to be empty');
      }
      
      const headers = (jsonData[0] as string[]).map(h => String(h || '').trim());
      const rawRows = jsonData.slice(1).filter((row: any) => 
        Array.isArray(row) && row.some(cell => String(cell || '').trim() !== '')
      );
      
      const rows = rawRows.map((row: any[]) => {
        const paddedRow = [...row];
        while (paddedRow.length < headers.length) {
          paddedRow.push('');
        }
        return paddedRow;
      });

      // Create job in Supabase
      const { data: jobData, error: jobError } = await supabase
        .from('data_jobs')
        .insert({
          tenant_id: context.tenantId,
          user_id: context.userId,
          job_type: 'import',
          entity_type: entityType,
          file_name: file.name,
          file_size: file.size,
          status: 'pending',
          counts: {
            total: rows.length,
            valid: 0,
            invalid: 0,
            processed: 0
          },
          record_count: rows.length,
        })
        .select()
        .single();

      if (jobError) throw jobError;

      // Store row data temporarily in localStorage (large data not suitable for JSONB)
      const tempData = { headers, rows };
      localStorage.setItem(`import_data_${jobData.id}`, JSON.stringify(tempData));

      const job: ImportJob = {
        id: jobData.id,
        entityType,
        fileName: file.name,
        fileSize: file.size,
        status: 'pending',
        userId: context.userId,
        createdAt: jobData.created_at,
        updatedAt: jobData.updated_at,
        counts: jobData.counts as any,
      };
      
      return { success: true, data: job };
    } catch (error) {
      console.error('File upload failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'File upload failed'
      };
    }
  }

  /**
   * Get import job details from Supabase
   */
  async getImportJob(jobId: string): Promise<{ success: boolean; data: ImportJob | null; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('data_jobs')
        .select('*')
        .eq('id', jobId)
        .eq('job_type', 'import')
        .single();

      if (error) throw error;

      if (!data) {
        return { success: false, data: null, error: 'Import job not found' };
      }

      const job: ImportJob = {
        id: data.id,
        entityType: data.entity_type as EntityType,
        fileName: data.file_name || '',
        fileSize: data.file_size || 0,
        status: data.status as any,
        userId: data.user_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        completedAt: data.completed_at || undefined,
        counts: data.counts as any,
        mapping: data.mapping as any,
        errors: data.errors as any,
      };

      return { success: true, data: job };
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
   */
  async validateImportData(jobId: string, mapping: ColumnMapping): Promise<{
    success: boolean;
    validRecords: any[];
    invalidRecords: any[];
    errors: any[];
    error?: string;
  }> {
    try {
      // Get job from Supabase
      const { data: jobData } = await supabase
        .from('data_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (!jobData) {
        return { success: false, validRecords: [], invalidRecords: [], errors: [], error: 'Import job not found' };
      }

      // Get row data from localStorage
      const tempData = localStorage.getItem(`import_data_${jobId}`);
      if (!tempData) {
        return { success: false, validRecords: [], invalidRecords: [], errors: [], error: 'Import data not found' };
      }

      const { headers, rows } = JSON.parse(tempData);
      const template = await entityTemplatesService.getTemplate(jobData.entity_type as EntityType);
      const requiredFields = template.columns.filter(col => col.isRequired).map(col => col.key);

      const validRecords: any[] = [];
      const invalidRecords: any[] = [];
      const errors: any[] = [];

      rows.forEach((row: any[], rowIndex: number) => {
        const record: Record<string, any> = {};
        const rowErrors: string[] = [];

        Object.entries(mapping).forEach(([templateKey, mapConfig]) => {
          if (mapConfig.sourceColumn) {
            const sourceColumn = mapConfig.sourceColumn.toLowerCase().trim();
            const sourceIndex = headers.findIndex((h: string) => 
              String(h || '').toLowerCase().trim() === sourceColumn
            );
            if (sourceIndex !== -1 && sourceIndex < row.length) {
              record[templateKey] = row[sourceIndex];
            }
          }
        });

        requiredFields.forEach(field => {
          const value = record[field];
          if (!value || String(value).trim() === '') {
            rowErrors.push(`Missing required field: ${field}`);
          }
        });

        if (rowErrors.length === 0) {
          validRecords.push({ ...record, _rowIndex: rowIndex });
        } else {
          const errorMessage = rowErrors.join('; ');
          invalidRecords.push({ ...record, _rowIndex: rowIndex + 2, _validationError: errorMessage });
          errors.push({
            id: `error_${rowIndex}`,
            jobId,
            row: rowIndex + 2,
            column: '',
            value: '',
            error: errorMessage,
            severity: 'error' as const,
            canAutoFix: false
          });
        }
      });

      return { success: true, validRecords, invalidRecords, errors };
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
   */
  async commitImport(jobId: string, mapping: ColumnMapping): Promise<{ success: boolean; data: ImportJob | null; error?: string }> {
    try {
      const { data: jobData } = await supabase
        .from('data_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (!jobData) {
        throw new Error('Import job not found');
      }

      const validationResult = await this.validateImportData(jobId, mapping);
      if (!validationResult.success) {
        throw new Error(validationResult.error || 'Validation failed');
      }

      const validRecords = validationResult.validRecords;
      let invalidRecords = validationResult.invalidRecords;
      let errors = validationResult.errors;

      // Update job status to processing
      await (supabase as any)
        .from('data_jobs')
        .update({ status: 'processing', mapping })
        .eq('id', jobId);

      let insertedCount = 0;

      if (validRecords.length > 0) {
        try {
          const insertResult = await importIntegrationService.insertRecords(
            jobData.entity_type as EntityType,
            validRecords
          );
          
          insertedCount = insertResult.insertedCount;
          
          if (insertResult.errors.length > 0) {
            insertResult.errors.forEach(err => {
              const failedIndex = validRecords.findIndex(r => r === err.record);
              if (failedIndex !== -1) {
                const failedRecord = validRecords.splice(failedIndex, 1)[0];
                failedRecord._errorMessage = `Database error: ${err.error}`;
                invalidRecords.push(failedRecord);
                errors.push({
                  id: `insert_error_${invalidRecords.length}`,
                  jobId,
                  row: (failedRecord._rowIndex || 0) + 2,
                  column: '',
                  value: '',
                  error: `Database error: ${err.error}`,
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

      // Update job in Supabase
      const { data: updatedJob, error: updateError } = await supabase
        .from('data_jobs')
        .update({
          status: 'completed',
          counts: {
            total: (jobData.counts as any)?.total || 0,
            valid: insertedCount,
            invalid: invalidRecords.length,
            processed: insertedCount
          },
          errors: errors,
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Clean up temp data
      localStorage.removeItem(`import_data_${jobId}`);

      // Trigger refresh
      if (insertedCount > 0) {
        window.dispatchEvent(new StorageEvent('storage', {
          key: `refresh_${jobData.entity_type}`,
          newValue: Date.now().toString()
        }));
      }

      const job: ImportJob = {
        id: updatedJob.id,
        entityType: updatedJob.entity_type as EntityType,
        fileName: updatedJob.file_name || '',
        fileSize: updatedJob.file_size || 0,
        status: updatedJob.status as any,
        userId: updatedJob.user_id,
        createdAt: updatedJob.created_at,
        updatedAt: updatedJob.updated_at,
        completedAt: updatedJob.completed_at || undefined,
        counts: updatedJob.counts as any,
        mapping: updatedJob.mapping as any,
        errors: updatedJob.errors as any,
      };

      return { success: true, data: job };
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
              error: record._errorMessage || record._validationError || 'Validation failed - check required fields',
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
   * Export data from Supabase
   */
  async exportData(request: ExportRequest): Promise<ExportResponse> {
    try {
      const context = await this.getContext();
      if (!context) {
        throw new Error('Not authenticated');
      }

      // Create job in Supabase
      const { data: jobData, error: jobError } = await (supabase as any)
        .from('data_jobs')
        .insert({
          tenant_id: context.tenantId,
          user_id: context.userId,
          job_type: 'export',
          entity_type: request.entityType,
          format: request.format,
          status: 'processing',
          filters: request.filters,
          record_count: 0,
        })
        .select()
        .single();

      if (jobError) throw jobError;

      const job: ExportJob = {
        id: jobData.id,
        entityType: request.entityType,
        format: request.format,
        status: 'processing',
        userId: context.userId,
        createdAt: jobData.created_at,
        filters: request.filters,
        recordCount: 0
      };

      // Start export in background
      this.performExport(jobData.id, request, context.tenantId).catch(console.error);

      return { success: true, data: job };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed'
      };
    }
  }

  private async performExport(jobId: string, request: ExportRequest, tenantId: string): Promise<void> {
    try {
      const tableName = this.getTableName(request.entityType);
      const { data, error } = await (supabase as any)
        .from(tableName)
        .select('*')
        .eq('tenant_id', tenantId);

      if (error) throw error;

      const transformedData = this.transformForExport(request.entityType, data || []);
      const ws = XLSX.utils.json_to_sheet(transformedData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, request.entityType);

      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);

      // Store URL in localStorage (blob URLs can't be stored in DB)
      localStorage.setItem(`export_file_${jobId}`, url);

      // Update job in Supabase
      await supabase
        .from('data_jobs')
        .update({
          status: 'completed',
          record_count: transformedData.length,
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId);

    } catch (error) {
      console.error('Export failed:', error);
      await supabase
        .from('data_jobs')
        .update({ status: 'failed' })
        .eq('id', jobId);
    }
  }

  private getTableName(entityType: EntityType): string {
    const tableMap: Record<EntityType, string> = {
      client: 'clients',
      employee: 'employees',
      court: 'courts',
      judge: 'judges'
    };
    return tableMap[entityType];
  }

  private transformForExport(entityType: EntityType, data: any[]): any[] {
    switch (entityType) {
      case 'client':
        return data.map(c => ({
          'Legal Name': c.display_name,
          'GSTIN': c.gstin || '',
          'PAN': c.pan || '',
          'Email': c.email || '',
          'Phone': c.phone || '',
          'City': c.city || '',
          'State': c.state || '',
          'Status': c.status || ''
        }));
      
      case 'court':
        return data.map(c => ({
          'Court Name': c.name,
          'Type': c.type || '',
          'Level': c.level || '',
          'Code': c.code || '',
          'City': c.city || '',
          'State': c.state || '',
          'Address': c.address || '',
          'Jurisdiction': c.jurisdiction || ''
        }));
      
      case 'judge':
        return data.map(j => ({
          'Judge Name': j.name,
          'Designation': j.designation || '',
          'Email': j.email || '',
          'Phone': j.phone || ''
        }));
      
      case 'employee':
        return data.map(e => ({
          'Full Name': e.full_name,
          'Employee Code': e.employee_code,
          'Email': e.email,
          'Mobile': e.mobile || '',
          'Designation': e.designation || '',
          'Department': e.department || '',
          'Role': e.role,
          'Status': e.status || ''
        }));
      
      default:
        return data;
    }
  }

  /**
   * Get export job status from Supabase
   */
  async getExportJob(jobId: string): Promise<{ success: boolean; data: ExportJob | null; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('data_jobs')
        .select('*')
        .eq('id', jobId)
        .eq('job_type', 'export')
        .single();

      if (error) throw error;

      if (!data) {
        return { success: false, data: null, error: 'Export job not found' };
      }

      // Get file URL from localStorage
      const fileUrl = localStorage.getItem(`export_file_${jobId}`);

      const job: ExportJob = {
        id: data.id,
        entityType: data.entity_type as EntityType,
        format: (data.format || 'xlsx') as 'xlsx' | 'csv',
        status: data.status as any,
        userId: data.user_id,
        createdAt: data.created_at,
        completedAt: data.completed_at || undefined,
        filters: data.filters as any,
        recordCount: data.record_count || 0,
        fileUrl: fileUrl || undefined,
      };

      return { success: true, data: job };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to fetch export job'
      };
    }
  }

  /**
   * Download export file
   */
  async downloadExport(jobId: string): Promise<TemplateResponse> {
    try {
      const jobResult = await this.getExportJob(jobId);
      
      if (!jobResult.success || !jobResult.data) {
        throw new Error('Export job not found');
      }

      const job = jobResult.data;
      
      if (job.status !== 'completed') {
        throw new Error('Export is not ready for download');
      }
      
      if (!job.fileUrl) {
        throw new Error('Download URL not available');
      }
      
      const response = await fetch(job.fileUrl);
      const blob = await response.blob();
      
      return { success: true, data: blob };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Download failed'
      };
    }
  }

  /**
   * Get all jobs for current user
   */
  async getJobs(jobType?: 'import' | 'export'): Promise<DataJob[]> {
    try {
      const context = await this.getContext();
      if (!context) return [];

      let query = supabase
        .from('data_jobs')
        .select('*')
        .eq('user_id', context.userId)
        .order('created_at', { ascending: false });

      if (jobType) {
        query = query.eq('job_type', jobType);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(d => ({
        ...d,
        job_type: d.job_type as 'import' | 'export',
        status: d.status as 'pending' | 'processing' | 'completed' | 'failed',
        counts: d.counts as any,
        mapping: d.mapping as any,
        errors: d.errors as any,
        filters: d.filters as any,
      }));
    } catch (error) {
      console.error('Error fetching jobs:', error);
      return [];
    }
  }
}

export const clientSideImportExportService = new ClientSideImportExportService();

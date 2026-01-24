/**
 * Client-Side Import/Export Service
 * Phase 4: Migrated to Supabase Storage for file persistence
 */

import * as XLSX from 'xlsx';
import { EntityType, ImportJob, ExportJob, ExportRequest, ImportResponse, ExportResponse, TemplateResponse, PendingRecord, ColumnMapping } from '@/types/importExport';
import { DataJob } from '@/types/notification';
import { entityTemplatesService } from './entityTemplatesService';
import { importIntegrationService } from './importIntegrationService';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_BUCKET = 'import-exports';

class ClientSideImportExportService {
  private async getContext(): Promise<{ userId: string; tenantId: string } | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single();
      if (!profile?.tenant_id) return null;
      return { userId: user.id, tenantId: profile.tenant_id };
    } catch { return null; }
  }

  async downloadTemplate(entityType: EntityType): Promise<TemplateResponse> {
    try {
      const template = await entityTemplatesService.getTemplate(entityType);
      if (!template?.columns?.length) throw new Error(`No template for: ${entityType}`);
      const wb = XLSX.utils.book_new();
      const headers = template.columns.map(col => col.label);
      const sampleData = template.columns.map(col => col.examples?.[0] || 'Sample');
      const ws = XLSX.utils.aoa_to_sheet([headers, sampleData]);
      ws['!cols'] = template.columns.map(() => ({ wch: 20 }));
      XLSX.utils.book_append_sheet(wb, ws, entityType);
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
      return { success: true, data: new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }) };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed' };
    }
  }

  async uploadForImport(entityType: EntityType, file: File): Promise<ImportResponse> {
    try {
      const context = await this.getContext();
      if (!context) throw new Error('Not authenticated');
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
      const rowCount = jsonData.slice(1).filter((r: any) => Array.isArray(r) && r.some(c => String(c || '').trim())).length;
      
      const { data: jobData, error: jobError } = await supabase.from('data_jobs').insert({
        tenant_id: context.tenantId, user_id: context.userId, job_type: 'import', entity_type: entityType,
        file_name: file.name, file_size: file.size, status: 'pending', record_count: rowCount,
        counts: { total: rowCount, valid: 0, invalid: 0, processed: 0 }
      }).select().single();
      if (jobError) throw jobError;

      const filePath = `${context.userId}/${jobData.id}/${file.name}`;
      const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(filePath, file, { upsert: true });
      if (uploadError) { await supabase.from('data_jobs').delete().eq('id', jobData.id); throw uploadError; }
      await supabase.from('data_jobs').update({ file_url: filePath }).eq('id', jobData.id);

      return { success: true, data: { id: jobData.id, entityType, fileName: file.name, fileSize: file.size, status: 'pending', userId: context.userId, createdAt: jobData.created_at, updatedAt: jobData.updated_at, counts: jobData.counts as any } };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Upload failed' };
    }
  }

  async getImportJob(jobId: string): Promise<{ success: boolean; data: ImportJob | null; error?: string }> {
    try {
      const { data, error } = await supabase.from('data_jobs').select('*').eq('id', jobId).eq('job_type', 'import').single();
      if (error) throw error;
      if (!data) return { success: false, data: null, error: 'Not found' };
      return { success: true, data: { id: data.id, entityType: data.entity_type as EntityType, fileName: data.file_name || '', fileSize: data.file_size || 0, status: data.status as any, userId: data.user_id, createdAt: data.created_at, updatedAt: data.updated_at, completedAt: data.completed_at || undefined, counts: data.counts as any, mapping: data.mapping as any, errors: data.errors as any } };
    } catch (error) {
      return { success: false, data: null, error: error instanceof Error ? error.message : 'Failed' };
    }
  }

  private async downloadAndParseFile(filePath: string): Promise<{ headers: string[]; rows: any[][] }> {
    const { data: fileData, error } = await supabase.storage.from(STORAGE_BUCKET).download(filePath);
    if (error || !fileData) throw error || new Error('File not found');
    const workbook = XLSX.read(await fileData.arrayBuffer(), { type: 'array' });
    const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
    const headers = (jsonData[0] as string[]).map(h => String(h || '').trim());
    const rows = jsonData.slice(1).filter((r: any) => Array.isArray(r) && r.some(c => String(c || '').trim())).map((r: any[]) => { while (r.length < headers.length) r.push(''); return r; });
    return { headers, rows };
  }

  async validateImportData(jobId: string, mapping: ColumnMapping): Promise<{ success: boolean; validRecords: any[]; invalidRecords: any[]; errors: any[]; error?: string }> {
    try {
      const { data: jobData } = await supabase.from('data_jobs').select('*').eq('id', jobId).single();
      if (!jobData?.file_url) return { success: false, validRecords: [], invalidRecords: [], errors: [], error: 'Job/file not found' };
      const { headers, rows } = await this.downloadAndParseFile(jobData.file_url);
      const template = await entityTemplatesService.getTemplate(jobData.entity_type as EntityType);
      const requiredFields = template.columns.filter(c => c.isRequired).map(c => c.key);
      const validRecords: any[] = [], invalidRecords: any[] = [], errors: any[] = [];
      rows.forEach((row, i) => {
        const record: Record<string, any> = {};
        Object.entries(mapping).forEach(([k, v]) => { if (v.sourceColumn) { const idx = headers.findIndex(h => h.toLowerCase() === v.sourceColumn.toLowerCase()); if (idx !== -1) record[k] = row[idx]; } });
        const rowErrors = requiredFields.filter(f => !record[f] || !String(record[f]).trim()).map(f => `Missing: ${f}`);
        if (rowErrors.length === 0) validRecords.push({ ...record, _rowIndex: i });
        else { invalidRecords.push({ ...record, _rowIndex: i + 2, _validationError: rowErrors.join('; ') }); errors.push({ id: `e_${i}`, jobId, row: i + 2, error: rowErrors.join('; '), severity: 'error', canAutoFix: false }); }
      });
      return { success: true, validRecords, invalidRecords, errors };
    } catch (error) {
      return { success: false, validRecords: [], invalidRecords: [], errors: [], error: error instanceof Error ? error.message : 'Validation failed' };
    }
  }

  async commitImport(jobId: string, mapping: ColumnMapping): Promise<{ success: boolean; data: ImportJob | null; error?: string }> {
    try {
      const { data: jobData } = await supabase.from('data_jobs').select('*').eq('id', jobId).single();
      if (!jobData) throw new Error('Job not found');
      const validation = await this.validateImportData(jobId, mapping);
      if (!validation.success) throw new Error(validation.error);
      await (supabase as any).from('data_jobs').update({ status: 'processing', mapping }).eq('id', jobId);
      let insertedCount = 0;
      if (validation.validRecords.length > 0) {
        const result = await importIntegrationService.insertRecords(jobData.entity_type as EntityType, validation.validRecords);
        insertedCount = result.insertedCount;
      }
      const { data: updated, error } = await supabase.from('data_jobs').update({ status: 'completed', counts: { total: (jobData.counts as any)?.total || 0, valid: insertedCount, invalid: validation.invalidRecords.length, processed: insertedCount }, errors: validation.errors, pending_data: validation.invalidRecords.length > 0 ? validation.invalidRecords : null, completed_at: new Date().toISOString() }).eq('id', jobId).select().single();
      if (error) throw error;
      if (insertedCount > 0) window.dispatchEvent(new StorageEvent('storage', { key: `refresh_${jobData.entity_type}`, newValue: Date.now().toString() }));
      return { success: true, data: { id: updated.id, entityType: updated.entity_type as EntityType, fileName: updated.file_name || '', fileSize: updated.file_size || 0, status: updated.status as any, userId: updated.user_id, createdAt: updated.created_at, updatedAt: updated.updated_at, completedAt: updated.completed_at || undefined, counts: updated.counts as any, mapping: updated.mapping as any, errors: updated.errors as any } };
    } catch (error) {
      return { success: false, data: null, error: error instanceof Error ? error.message : 'Commit failed' };
    }
  }

  async getPendingRecords(jobId: string): Promise<{ success: boolean; data: PendingRecord[]; error?: string }> {
    try {
      const { data } = await supabase.from('data_jobs').select('pending_data').eq('id', jobId).single();
      const pending = (data?.pending_data as any[]) || [];
      return { success: true, data: pending.map((r, i) => ({ id: `p_${jobId}_${i}`, jobId, row: r._rowIndex || i + 2, originalData: r, errors: [{ id: `e_${i}`, jobId, row: r._rowIndex || i + 2, column: '', value: '', error: r._validationError || 'Validation failed', severity: 'error' as const, canAutoFix: false }], status: 'pending' as const })) };
    } catch (error) {
      return { success: false, data: [], error: error instanceof Error ? error.message : 'Failed' };
    }
  }

  async exportData(request: ExportRequest): Promise<ExportResponse> {
    try {
      const context = await this.getContext();
      if (!context) throw new Error('Not authenticated');
      const { data: jobData, error } = await (supabase as any).from('data_jobs').insert({ tenant_id: context.tenantId, user_id: context.userId, job_type: 'export', entity_type: request.entityType, format: request.format, status: 'processing', filters: request.filters, record_count: 0 }).select().single();
      if (error) throw error;
      this.performExport(jobData.id, request, context.tenantId, context.userId).catch(console.error);
      return { success: true, data: { id: jobData.id, entityType: request.entityType, format: request.format, status: 'processing', userId: context.userId, createdAt: jobData.created_at, filters: request.filters, recordCount: 0 } };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Export failed' };
    }
  }

  private async performExport(jobId: string, request: ExportRequest, tenantId: string, userId: string): Promise<void> {
    try {
      const tableMap: Record<EntityType, string> = { client: 'clients', employee: 'employees', court: 'courts', judge: 'judges' };
      const { data } = await (supabase as any).from(tableMap[request.entityType]).select('*').eq('tenant_id', tenantId);
      const ws = XLSX.utils.json_to_sheet(data || []);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, request.entityType);
      const blob = new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const fileName = `${request.entityType}_export.xlsx`;
      const filePath = `${userId}/${jobId}/${fileName}`;
      await supabase.storage.from(STORAGE_BUCKET).upload(filePath, blob, { upsert: true });
      await supabase.from('data_jobs').update({ status: 'completed', record_count: (data || []).length, file_url: filePath, file_name: fileName, completed_at: new Date().toISOString() }).eq('id', jobId);
    } catch { await supabase.from('data_jobs').update({ status: 'failed' }).eq('id', jobId); }
  }

  async getExportJob(jobId: string): Promise<{ success: boolean; data: ExportJob | null; error?: string }> {
    try {
      const { data, error } = await supabase.from('data_jobs').select('*').eq('id', jobId).eq('job_type', 'export').single();
      if (error) throw error;
      if (!data) return { success: false, data: null, error: 'Not found' };
      let fileUrl: string | undefined;
      if (data.file_url && data.status === 'completed') { const { data: signed } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(data.file_url, 3600); fileUrl = signed?.signedUrl; }
      return { success: true, data: { id: data.id, entityType: data.entity_type as EntityType, format: (data.format || 'xlsx') as 'xlsx' | 'csv', status: data.status as any, userId: data.user_id, createdAt: data.created_at, completedAt: data.completed_at || undefined, filters: data.filters as any, recordCount: data.record_count || 0, fileUrl } };
    } catch (error) {
      return { success: false, data: null, error: error instanceof Error ? error.message : 'Failed' };
    }
  }

  async downloadExport(jobId: string): Promise<TemplateResponse> {
    try {
      const job = await this.getExportJob(jobId);
      if (!job.success || !job.data?.fileUrl) throw new Error('Export not ready');
      const response = await fetch(job.data.fileUrl);
      return { success: true, data: await response.blob() };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Download failed' };
    }
  }

  async getJobMapping(jobId: string): Promise<ColumnMapping | null> {
    try {
      const { data } = await supabase.from('data_jobs').select('mapping').eq('id', jobId).single();
      return data?.mapping as unknown as ColumnMapping | null;
    } catch { return null; }
  }

  async saveJobMapping(jobId: string, mapping: ColumnMapping): Promise<void> {
    await (supabase as any).from('data_jobs').update({ mapping }).eq('id', jobId);
  }

  async getJobs(jobType?: 'import' | 'export'): Promise<DataJob[]> {
    try {
      const context = await this.getContext();
      if (!context) return [];
      let query = supabase.from('data_jobs').select('*').eq('user_id', context.userId).order('created_at', { ascending: false });
      if (jobType) query = query.eq('job_type', jobType);
      const { data } = await query;
      return (data || []).map(d => ({ ...d, job_type: d.job_type as 'import' | 'export', status: d.status as any, counts: d.counts as any, mapping: d.mapping as any, errors: d.errors as any, filters: d.filters as any }));
    } catch { return []; }
  }
}

export const clientSideImportExportService = new ClientSideImportExportService();

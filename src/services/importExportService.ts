/**
 * Import/Export Service for Contacts & Masters
 * Handles all import/export operations with generic REST API integration
 */

import { apiService, ApiResponse } from './apiService';
import { featureFlagService } from './featureFlagService';
import {
  EntityType,
  ImportJob,
  ExportJob,
  ExportRequest,
  ImportResponse,
  ExportResponse,
  TemplateResponse,
  PendingRecord,
  ColumnMapping,
  MappingProfile
} from '@/types/importExport';

class ImportExportService {
  /**
   * Check if import/export feature is enabled
   */
  isEnabled(): boolean {
    return featureFlagService.isEnabled('data_io_v1');
  }

  /**
   * Download template for specified entity type
   */
  async downloadTemplate(entityType: EntityType): Promise<TemplateResponse> {
    if (!this.isEnabled()) {
      return {
        success: false,
        error: 'Import/Export feature is not enabled'
      };
    }

    try {
      const response = await fetch(`/api/io/templates/${entityType}.xlsx`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      return {
        success: true,
        data: blob
      };
    } catch (error) {
      console.error('Template download failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Template download failed'
      };
    }
  }

  /**
   * Upload file for import processing
   */
  async uploadForImport(entityType: EntityType, file: File): Promise<ImportResponse> {
    if (!this.isEnabled()) {
      return {
        success: false,
        error: 'Import/Export feature is not enabled'
      };
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entityType', entityType);

      const response = await fetch(`/api/io/import/${entityType}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
        },
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return {
        success: true,
        data: result
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
   * Get import job status and details
   */
  async getImportJob(jobId: string): Promise<ApiResponse<ImportJob>> {
    try {
      return await apiService.get(`/api/io/import/${jobId}`);
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to fetch import job'
      };
    }
  }

  /**
   * Commit import job (finalize valid rows)
   */
  async commitImport(jobId: string, mapping: ColumnMapping): Promise<ApiResponse<ImportJob>> {
    try {
      return await apiService.post(`/api/io/import/${jobId}/commit`, { mapping });
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to commit import'
      };
    }
  }

  /**
   * Retry import with corrected data
   */
  async retryImport(jobId: string, corrections: PendingRecord[]): Promise<ApiResponse<ImportJob>> {
    try {
      return await apiService.post(`/api/io/import/${jobId}/retry`, { corrections });
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to retry import'
      };
    }
  }

  /**
   * Get pending records for a job
   */
  async getPendingRecords(jobId: string): Promise<ApiResponse<PendingRecord[]>> {
    try {
      return await apiService.get(`/api/io/import/${jobId}/pending`);
    } catch (error) {
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Failed to fetch pending records'
      };
    }
  }

  /**
   * Export data with filters
   */
  async exportData(request: ExportRequest): Promise<ExportResponse> {
    if (!this.isEnabled()) {
      return {
        success: false,
        error: 'Import/Export feature is not enabled'
      };
    }

    try {
      const response = await apiService.post(`/api/io/export/${request.entityType}`, request);
      return response as ExportResponse;
    } catch (error) {
      return {
        success: false,
        data: undefined,
        error: error instanceof Error ? error.message : 'Export failed'
      };
    }
  }

  /**
   * Get export job status
   */
  async getExportJob(jobId: string): Promise<ApiResponse<ExportJob>> {
    try {
      return await apiService.get(`/api/io/export/${jobId}`);
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to fetch export job'
      };
    }
  }

  /**
   * Download exported file
   */
  async downloadExport(jobId: string): Promise<TemplateResponse> {
    try {
      const response = await fetch(`/api/io/export/${jobId}/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
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

  /**
   * Save column mapping profile
   */
  async saveMappingProfile(profile: Omit<MappingProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<MappingProfile>> {
    try {
      return await apiService.post('/api/io/mapping-profiles', profile);
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to save mapping profile'
      };
    }
  }

  /**
   * Get mapping profiles for entity type
   */
  async getMappingProfiles(entityType: EntityType): Promise<ApiResponse<MappingProfile[]>> {
    try {
      return await apiService.get(`/api/io/mapping-profiles/${entityType}`);
    } catch (error) {
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Failed to fetch mapping profiles'
      };
    }
  }

  /**
   * Get import/export audit logs
   */
  async getAuditLogs(entityType?: EntityType, limit: number = 50): Promise<ApiResponse<any[]>> {
    try {
      const params = new URLSearchParams({ limit: limit.toString() });
      if (entityType) {
        params.append('entityType', entityType);
      }
      
      return await apiService.get(`/api/io/audit?${params.toString()}`);
    } catch (error) {
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Failed to fetch audit logs'
      };
    }
  }

  /**
   * Delete import job and associated data
   */
  async deleteImportJob(jobId: string): Promise<ApiResponse<boolean>> {
    try {
      return await apiService.delete(`/api/io/import/${jobId}`);
    } catch (error) {
      return {
        success: false,
        data: false,
        error: error instanceof Error ? error.message : 'Failed to delete import job'
      };
    }
  }

  /**
   * Get import/export statistics
   */
  async getStatistics(entityType?: EntityType): Promise<ApiResponse<{
    totalImports: number;
    totalExports: number;
    successfulImports: number;
    failedImports: number;
    recordsImported: number;
    recordsExported: number;
  }>> {
    try {
      const params = entityType ? `?entityType=${entityType}` : '';
      return await apiService.get(`/api/io/statistics${params}`);
    } catch (error) {
      return {
        success: false,
        data: {
          totalImports: 0,
          totalExports: 0,
          successfulImports: 0,
          failedImports: 0,
          recordsImported: 0,
          recordsExported: 0
        },
        error: error instanceof Error ? error.message : 'Failed to fetch statistics'
      };
    }
  }
}

export const importExportService = new ImportExportService();
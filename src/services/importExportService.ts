/**
 * Import/Export Service for Contacts & Masters
 * Handles all import/export operations with generic REST API integration
 */

import { apiService, ApiResponse } from './apiService';
import { featureFlagService } from './featureFlagService';
import { clientSideImportExportService } from './clientSideImportExportService';
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

    // Use client-side service for now since backend APIs are not available
    return clientSideImportExportService.downloadTemplate(entityType);
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

    // Use client-side service for now since backend APIs are not available
    return clientSideImportExportService.uploadForImport(entityType, file);
  }

  /**
   * Get import job status and details
   */
  async getImportJob(jobId: string): Promise<ApiResponse<ImportJob>> {
    return clientSideImportExportService.getImportJob(jobId);
  }

  /**
   * Validate import data without database insertion
   * Returns validation results for preview
   */
  async validateImportData(jobId: string, mapping: ColumnMapping): Promise<{
    success: boolean;
    validRecords: any[];
    invalidRecords: any[];
    errors: any[];
    error?: string;
  }> {
    return clientSideImportExportService.validateImportData(jobId, mapping);
  }

  /**
   * Commit import job (finalize valid rows)
   */
  async commitImport(jobId: string, mapping: ColumnMapping): Promise<ApiResponse<ImportJob>> {
    return clientSideImportExportService.commitImport(jobId, mapping);
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
    return clientSideImportExportService.getPendingRecords(jobId);
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

    return clientSideImportExportService.exportData(request);
  }

  /**
   * Get export job status
   */
  async getExportJob(jobId: string): Promise<ApiResponse<ExportJob>> {
    return clientSideImportExportService.getExportJob(jobId);
  }

  /**
   * Download exported file
   */
  async downloadExport(jobId: string): Promise<TemplateResponse> {
    return clientSideImportExportService.downloadExport(jobId);
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
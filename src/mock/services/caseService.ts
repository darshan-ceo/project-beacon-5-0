/**
 * Case Service - DEMO mode implementation with write-through pattern
 */

import { unifiedStore } from '@/persistence/unifiedStore';
import type { Case } from '@/contexts/AppStateContext';
import type { TimelineEntry } from '@/persistence/unifiedStore';
import type { 
  CaseService, 
  CreateCaseData, 
  UpdateCaseData, 
  ApiResponse 
} from '@/mock/apiContracts';
import { demoConfig } from '@/config/demoConfig';

class CaseServiceImpl implements CaseService {
  async create(data: CreateCaseData): Promise<ApiResponse<Case>> {
    try {
      demoConfig.assertDemoMode();
      await demoConfig.simulateDelay();
      
      const newCase: Case = {
        id: `case_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...data,
        timelineBreachStatus: 'Green',
        status: 'Active',
        createdDate: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        documents: 0,
        progress: 0,
        generatedForms: []
      };

      // Write-through pattern: UnifiedStore -> AppState (via dispatch)
      await unifiedStore.cases.create(newCase);

      return {
        success: true,
        data: newCase,
        message: 'Case created successfully'
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Create Case');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async update(id: string, data: UpdateCaseData): Promise<ApiResponse<Case>> {
    try {
      demoConfig.assertDemoMode();
      await demoConfig.simulateDelay();

      const updates = {
        ...data,
        lastUpdated: new Date().toISOString()
      };

      const updatedCase = await unifiedStore.cases.update(id, updates);

      return {
        success: true,
        data: updatedCase,
        message: 'Case updated successfully'
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Update Case');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      demoConfig.assertDemoMode();
      await demoConfig.simulateDelay();

      await unifiedStore.cases.delete(id);

      return {
        success: true,
        message: 'Case deleted successfully'
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Delete Case');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async getById(id: string): Promise<ApiResponse<Case>> {
    try {
      demoConfig.assertDemoMode();
      await demoConfig.simulateDelay();

      const caseItem = await unifiedStore.cases.getById(id);
      if (!caseItem) {
        return {
          success: false,
          error: 'Case not found'
        };
      }

      return {
        success: true,
        data: caseItem
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Get Case');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async getAll(): Promise<ApiResponse<Case[]>> {
    try {
      demoConfig.assertDemoMode();
      await demoConfig.simulateDelay();

      const cases = await unifiedStore.cases.getAll();

      return {
        success: true,
        data: cases
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Get All Cases');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async getTimeline(caseId: string): Promise<ApiResponse<TimelineEntry[]>> {
    try {
      demoConfig.assertDemoMode();
      await demoConfig.simulateDelay();

      const timeline = await unifiedStore.timeline.getByCaseId(caseId);

      return {
        success: true,
        data: timeline
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Get Case Timeline');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async addTimelineEntry(caseId: string, entry: Omit<TimelineEntry, 'id' | 'ts'>): Promise<ApiResponse<TimelineEntry>> {
    try {
      demoConfig.assertDemoMode();
      await demoConfig.simulateDelay();

      const timelineEntry: TimelineEntry = {
        id: `timeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...entry,
        ts: new Date().toISOString()
      };

      await unifiedStore.timeline.create(timelineEntry);

      return {
        success: true,
        data: timelineEntry,
        message: 'Timeline entry added successfully'
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Add Timeline Entry');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }
}

export const caseService = new CaseServiceImpl();
/**
 * Hearing Service - DEMO mode implementation with write-through pattern
 */

import { unifiedStore } from '@/persistence/unifiedStore';
import type { Hearing } from '@/contexts/AppStateContext';
import type { 
  HearingService, 
  CreateHearingData, 
  UpdateHearingData, 
  ApiResponse 
} from '@/mock/apiContracts';
import { demoConfig } from '@/config/demoConfig';

class HearingServiceImpl implements HearingService {
  async create(data: CreateHearingData): Promise<ApiResponse<Hearing>> {
    try {
      demoConfig.assertDemoMode();
      await demoConfig.simulateDelay();
      
      const newHearing: Hearing = {
        id: `hearing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...data,
        status: 'scheduled',
        timezone: 'Asia/Kolkata',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Legacy compatibility fields
        caseId: data.case_id,
        courtId: data.court_id,
        judgeId: data.judge_ids[0] || '',
        time: data.start_time,
        type: 'Preliminary',
        createdDate: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };

      await unifiedStore.hearings.create(newHearing);

      return {
        success: true,
        data: newHearing,
        message: 'Hearing created successfully'
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Create Hearing');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async update(id: string, data: UpdateHearingData): Promise<ApiResponse<Hearing>> {
    try {
      demoConfig.assertDemoMode();
      await demoConfig.simulateDelay();

      const updates: Partial<Hearing> = {
        ...data,
        updated_at: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };

      const updatedHearing = await unifiedStore.hearings.update(id, updates);

      return {
        success: true,
        data: updatedHearing,
        message: 'Hearing updated successfully'
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Update Hearing');
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

      await unifiedStore.hearings.delete(id);

      return {
        success: true,
        message: 'Hearing deleted successfully'
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Delete Hearing');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async getById(id: string): Promise<ApiResponse<Hearing>> {
    try {
      demoConfig.assertDemoMode();
      await demoConfig.simulateDelay();

      const hearing = await unifiedStore.hearings.getById(id);
      if (!hearing) {
        return {
          success: false,
          error: 'Hearing not found'
        };
      }

      return {
        success: true,
        data: hearing
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Get Hearing');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async getAll(): Promise<ApiResponse<Hearing[]>> {
    try {
      demoConfig.assertDemoMode();
      await demoConfig.simulateDelay();

      const hearings = await unifiedStore.hearings.getAll();

      return {
        success: true,
        data: hearings
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Get All Hearings');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async getByCase(caseId: string): Promise<ApiResponse<Hearing[]>> {
    try {
      demoConfig.assertDemoMode();
      await demoConfig.simulateDelay();

      const hearings = await unifiedStore.hearings.query((hearing) => 
        hearing.case_id === caseId || hearing.caseId === caseId
      );

      return {
        success: true,
        data: hearings
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Get Hearings by Case');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async getByDateRange(startDate: string, endDate: string): Promise<ApiResponse<Hearing[]>> {
    try {
      demoConfig.assertDemoMode();
      await demoConfig.simulateDelay();

      const start = new Date(startDate);
      const end = new Date(endDate);

      const hearings = await unifiedStore.hearings.query((hearing) => {
        const hearingDate = new Date(hearing.date);
        return hearingDate >= start && hearingDate <= end;
      });

      return {
        success: true,
        data: hearings
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Get Hearings by Date Range');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }
}

export const hearingService = new HearingServiceImpl();
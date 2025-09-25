/**
 * Court Service - DEMO mode implementation with write-through pattern
 */

import { unifiedStore } from '@/persistence/unifiedStore';
import type { Court } from '@/contexts/AppStateContext';
import type { 
  CourtService, 
  CreateCourtData, 
  UpdateCourtData, 
  ApiResponse 
} from '@/mock/apiContracts';
import { demoConfig } from '@/config/demoConfig';

class CourtServiceImpl implements CourtService {
  async create(data: CreateCourtData): Promise<ApiResponse<Court>> {
    try {
      demoConfig.assertDemoMode();
      await demoConfig.simulateDelay();
      
      const newCourt: Court = {
        id: `court_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...data,
        totalJudges: 0,
        activeCases: 0,
        avgHearingTime: '0 days'
      };

      await unifiedStore.courts.create(newCourt);

      return {
        success: true,
        data: newCourt,
        message: 'Court created successfully'
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Create Court');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async update(id: string, data: UpdateCourtData): Promise<ApiResponse<Court>> {
    try {
      demoConfig.assertDemoMode();
      await demoConfig.simulateDelay();

      const updatedCourt = await unifiedStore.courts.update(id, data);

      return {
        success: true,
        data: updatedCourt,
        message: 'Court updated successfully'
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Update Court');
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

      await unifiedStore.courts.delete(id);

      return {
        success: true,
        message: 'Court deleted successfully'
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Delete Court');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async getById(id: string): Promise<ApiResponse<Court>> {
    try {
      demoConfig.assertDemoMode();
      await demoConfig.simulateDelay();

      const court = await unifiedStore.courts.getById(id);
      if (!court) {
        return {
          success: false,
          error: 'Court not found'
        };
      }

      return {
        success: true,
        data: court
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Get Court');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async getAll(): Promise<ApiResponse<Court[]>> {
    try {
      demoConfig.assertDemoMode();
      await demoConfig.simulateDelay();

      const courts = await unifiedStore.courts.getAll();

      return {
        success: true,
        data: courts
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Get All Courts');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }
}

export const courtService = new CourtServiceImpl();
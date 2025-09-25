/**
 * Judge Service - DEMO mode implementation with write-through pattern
 */

import { unifiedStore } from '@/persistence/unifiedStore';
import type { Judge } from '@/contexts/AppStateContext';
import type { 
  JudgeService, 
  CreateJudgeData, 
  UpdateJudgeData, 
  ApiResponse 
} from '@/mock/apiContracts';
import { demoConfig } from '@/config/demoConfig';

class JudgeServiceImpl implements JudgeService {
  async create(data: CreateJudgeData): Promise<ApiResponse<Judge>> {
    try {
      demoConfig.assertDemoMode();
      await demoConfig.simulateDelay();
      
      const newJudge: Judge = {
        id: `judge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...data,
        yearsOfService: this.calculateYearsOfService(data.appointmentDate),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await unifiedStore.judges.create(newJudge);

      return {
        success: true,
        data: newJudge,
        message: 'Judge created successfully'
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Create Judge');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async update(id: string, data: UpdateJudgeData): Promise<ApiResponse<Judge>> {
    try {
      demoConfig.assertDemoMode();
      await demoConfig.simulateDelay();

      const updates: Partial<Judge> = {
        ...data,
        updatedAt: new Date().toISOString()
      };

      // Recalculate years of service if appointment date changed
      if (data.appointmentDate) {
        updates.yearsOfService = this.calculateYearsOfService(data.appointmentDate);
      }

      const updatedJudge = await unifiedStore.judges.update(id, updates);

      return {
        success: true,
        data: updatedJudge,
        message: 'Judge updated successfully'
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Update Judge');
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

      await unifiedStore.judges.delete(id);

      return {
        success: true,
        message: 'Judge deleted successfully'
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Delete Judge');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async getById(id: string): Promise<ApiResponse<Judge>> {
    try {
      demoConfig.assertDemoMode();
      await demoConfig.simulateDelay();

      const judge = await unifiedStore.judges.getById(id);
      if (!judge) {
        return {
          success: false,
          error: 'Judge not found'
        };
      }

      return {
        success: true,
        data: judge
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Get Judge');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async getAll(): Promise<ApiResponse<Judge[]>> {
    try {
      demoConfig.assertDemoMode();
      await demoConfig.simulateDelay();

      const judges = await unifiedStore.judges.getAll();

      return {
        success: true,
        data: judges
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Get All Judges');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async getByCourt(courtId: string): Promise<ApiResponse<Judge[]>> {
    try {
      demoConfig.assertDemoMode();
      await demoConfig.simulateDelay();

      const judges = await unifiedStore.judges.query((judge) => judge.courtId === courtId);

      return {
        success: true,
        data: judges
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Get Judges by Court');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  private calculateYearsOfService(appointmentDate: string): number {
    const appointed = new Date(appointmentDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - appointed.getTime());
    const diffYears = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365.25));
    return diffYears;
  }
}

export const judgeService = new JudgeServiceImpl();
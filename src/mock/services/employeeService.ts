/**
 * Employee Service - DEMO mode implementation with write-through pattern
 */

import { unifiedStore } from '@/persistence/unifiedStore';
import type { Employee } from '@/contexts/AppStateContext';
import type { 
  EmployeeService, 
  CreateEmployeeData, 
  UpdateEmployeeData, 
  ApiResponse 
} from '@/mock/apiContracts';
import { demoConfig } from '@/config/demoConfig';

class EmployeeServiceImpl implements EmployeeService {
  async create(data: CreateEmployeeData): Promise<ApiResponse<Employee>> {
    try {
      demoConfig.assertDemoMode();
      await demoConfig.simulateDelay();
      
      const newEmployee: Employee = {
        id: `emp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...data
      };

      await unifiedStore.employees.create(newEmployee);

      return {
        success: true,
        data: newEmployee,
        message: 'Employee created successfully'
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Create Employee');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async update(id: string, data: UpdateEmployeeData): Promise<ApiResponse<Employee>> {
    try {
      demoConfig.assertDemoMode();
      await demoConfig.simulateDelay();

      const updatedEmployee = await unifiedStore.employees.update(id, data);

      return {
        success: true,
        data: updatedEmployee,
        message: 'Employee updated successfully'
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Update Employee');
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

      await unifiedStore.employees.delete(id);

      return {
        success: true,
        message: 'Employee deleted successfully'
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Delete Employee');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async getById(id: string): Promise<ApiResponse<Employee>> {
    try {
      demoConfig.assertDemoMode();
      await demoConfig.simulateDelay();

      const employee = await unifiedStore.employees.getById(id);
      if (!employee) {
        return {
          success: false,
          error: 'Employee not found'
        };
      }

      return {
        success: true,
        data: employee
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Get Employee');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async getAll(): Promise<ApiResponse<Employee[]>> {
    try {
      demoConfig.assertDemoMode();
      await demoConfig.simulateDelay();

      const employees = await unifiedStore.employees.getAll();

      return {
        success: true,
        data: employees
      };
    } catch (error) {
      demoConfig.handleError(error as Error, 'Get All Employees');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }
}

export const employeeService = new EmployeeServiceImpl();
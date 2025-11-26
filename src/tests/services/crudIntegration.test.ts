import { describe, it, expect, vi, beforeEach } from 'vitest';
import { casesService } from '@/services/casesService';
import { clientsService } from '@/services/clientsService';
import { tasksService } from '@/services/tasksService';
import { courtsService } from '@/services/courtsService';
import { judgesService } from '@/services/judgesService';

// Mock storageManager
vi.mock('@/data/StorageManager', () => ({
  storageManager: {
    getStorage: () => ({
      create: vi.fn().mockResolvedValue({ id: 'test-uuid-123' }),
      update: vi.fn().mockResolvedValue(true),
      delete: vi.fn().mockResolvedValue(true)
    })
  }
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn()
}));

describe('CRUD Integration Tests', () => {
  const mockDispatch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CasesService', () => {
    it('should create case and dispatch ADD_CASE', async () => {
      const caseData = { 
        title: 'Test Case', 
        clientId: 'client-1',
        caseNumber: 'CASE-001',
        status: 'Active' as const
      };
      
      const result = await casesService.create(caseData, mockDispatch);
      
      expect(result).toHaveProperty('id');
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ADD_CASE',
        payload: expect.objectContaining({ title: 'Test Case' })
      });
    });

    it('should update case and dispatch UPDATE_CASE', async () => {
      await casesService.update('case-1', { title: 'Updated Case' }, mockDispatch);
      
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'UPDATE_CASE',
        payload: expect.objectContaining({ id: 'case-1' })
      });
    });

    it('should delete case and dispatch DELETE_CASE', async () => {
      await casesService.delete('case-1', mockDispatch);
      
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'DELETE_CASE',
        payload: 'case-1'
      });
    });
  });

  describe('ClientsService', () => {
    it('should create client with validation', async () => {
      const clientData = { 
        name: 'Test Client', 
        pan: 'ABCDE1234F',
        type: 'Individual' as const,
        category: 'Regular Dealer' as const,
        status: 'Active' as const
      };
      
      const result = await clientsService.create(clientData, mockDispatch);
      
      expect(result).toHaveProperty('id');
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ADD_CLIENT',
        payload: expect.objectContaining({ name: 'Test Client' })
      });
    });

    it('should reject invalid PAN format', async () => {
      const clientData = { 
        name: 'Test', 
        pan: 'invalid',
        type: 'Individual' as const,
        category: 'Regular Dealer' as const,
        status: 'Active' as const
      };
      
      await expect(clientsService.create(clientData, mockDispatch))
        .rejects.toThrow();
    });
  });

  describe('TasksService', () => {
    it('should create task linked to case', async () => {
      const taskData = { 
        title: 'Test Task', 
        caseId: 'case-1',
        clientId: 'client-1',
        caseNumber: 'CASE-001',
        stage: 'Assessment',
        priority: 'Medium' as const,
        status: 'Not Started' as const,
        assignedToId: 'user-1',
        assignedToName: 'John Doe',
        dueDate: '2025-12-31',
        estimatedHours: 8
      };
      
      const result = await tasksService.create(taskData, mockDispatch);
      
      expect(result).toHaveProperty('id');
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ADD_TASK',
        payload: expect.objectContaining({ title: 'Test Task', caseId: 'case-1' })
      });
    });

    it('should update task and dispatch UPDATE_TASK', async () => {
      await tasksService.update('task-1', { 
        title: 'Updated Task',
        status: 'Completed' as const
      }, mockDispatch);
      
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'UPDATE_TASK',
        payload: expect.objectContaining({ id: 'task-1' })
      });
    });

    it('should delete task and dispatch DELETE_TASK', async () => {
      await tasksService.delete('task-1', mockDispatch);
      
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'DELETE_TASK',
        payload: 'task-1'
      });
    });
  });

  describe('CourtsService', () => {
    it('should create court with required city', async () => {
      const courtData = { 
        name: 'Test Court', 
        type: 'District Court' as const,
        jurisdiction: 'Mumbai',
        address: '123 Main St',
        city: 'Mumbai',
        digitalFiling: true,
        workingDays: ['Monday', 'Tuesday'],
        status: 'Active' as const
      };
      
      const result = await courtsService.create(courtData, mockDispatch);
      
      expect(result).toHaveProperty('id');
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ADD_COURT',
        payload: expect.objectContaining({ name: 'Test Court', city: 'Mumbai' })
      });
    });

    it('should reject court without city', async () => {
      const courtData = { 
        name: 'Test Court', 
        type: 'District Court' as const,
        jurisdiction: 'Mumbai',
        address: '123 Main St',
        city: '',
        digitalFiling: true,
        workingDays: ['Monday'],
        status: 'Active' as const
      };
      
      await expect(courtsService.create(courtData, mockDispatch))
        .rejects.toThrow('City is required');
    });
  });

  describe('JudgesService', () => {
    it('should create judge with years of service calculation', async () => {
      const judgeData = { 
        name: 'Hon. Justice Smith', 
        designation: 'District Judge',
        status: 'Active' as const,
        courtId: 'court-1',
        appointmentDate: '2020-01-01',
        phone: '1234567890',
        email: 'judge@court.gov'
      };
      
      const result = await judgesService.create(judgeData, mockDispatch);
      
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('yearsOfService');
      expect(result.yearsOfService).toBeGreaterThan(0);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ADD_JUDGE',
        payload: expect.objectContaining({ name: 'Hon. Justice Smith' })
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle storage errors gracefully for cases', async () => {
      // Mock storage failure
      const mockStorage = {
        create: vi.fn().mockRejectedValue(new Error('Database error')),
        update: vi.fn(),
        delete: vi.fn()
      };
      
      vi.mocked(require('@/data/StorageManager').storageManager.getStorage).mockReturnValueOnce(mockStorage);

      await expect(casesService.create({ title: 'Test', clientId: 'c1', caseNumber: 'C1', status: 'Active' }, mockDispatch))
        .rejects.toThrow('Database error');
      
      // Dispatch should NOT be called on failure
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('should handle storage errors gracefully for tasks', async () => {
      const mockStorage = {
        create: vi.fn().mockRejectedValue(new Error('Connection timeout')),
        update: vi.fn(),
        delete: vi.fn()
      };
      
      vi.mocked(require('@/data/StorageManager').storageManager.getStorage).mockReturnValueOnce(mockStorage);

      const taskData = {
        title: 'Test Task',
        caseId: 'case-1',
        clientId: 'client-1',
        caseNumber: 'CASE-001',
        stage: 'Assessment',
        priority: 'Medium' as const,
        status: 'Not Started' as const,
        assignedToId: 'user-1',
        assignedToName: 'John Doe',
        dueDate: '2025-12-31',
        estimatedHours: 8
      };

      await expect(tasksService.create(taskData, mockDispatch))
        .rejects.toThrow('Connection timeout');
      
      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });

  describe('Consistency Checks', () => {
    it('all services should follow same dispatch pattern', async () => {
      const caseResult = await casesService.create({ title: 'Test', clientId: 'c1', caseNumber: 'C1', status: 'Active' }, mockDispatch);
      const clientResult = await clientsService.create({ name: 'Test', pan: 'ABCDE1234F', type: 'Individual', category: 'Regular Dealer', status: 'Active' }, mockDispatch);
      
      // Both should dispatch with same structure
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: expect.any(String), payload: expect.any(Object) })
      );
      
      // Both should return objects with id
      expect(caseResult).toHaveProperty('id');
      expect(clientResult).toHaveProperty('id');
    });

    it('all services should show toast notifications', async () => {
      const { toast } = await import('@/hooks/use-toast');
      
      await casesService.create({ title: 'Test', clientId: 'c1', caseNumber: 'C1', status: 'Active' }, mockDispatch);
      await clientsService.create({ name: 'Test', pan: 'ABCDE1234F', type: 'Individual', category: 'Regular Dealer', status: 'Active' }, mockDispatch);
      
      // Both should call toast
      expect(toast).toHaveBeenCalled();
    });
  });
});

/**
 * SupabaseAdapter Test Suite
 * Tests CRUD operations, tenant isolation, RLS enforcement, and error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SupabaseAdapter } from './SupabaseAdapter';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
    from: vi.fn(),
  },
}));

describe('SupabaseAdapter', () => {
  let adapter: SupabaseAdapter;
  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-456';

  beforeEach(() => {
    adapter = new SupabaseAdapter();
    
    // Mock successful auth session
    (supabase.auth.getSession as any).mockResolvedValue({
      data: {
        session: {
          user: { id: mockUserId }
        }
      },
      error: null
    });

    // Mock profile query
    const mockFrom = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: { tenant_id: mockTenantId },
            error: null
          }))
        }))
      }))
    }));
    
    (supabase.from as any).mockImplementation(mockFrom);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize successfully with valid session', async () => {
      await adapter.initialize();
      expect(supabase.auth.getSession).toHaveBeenCalled();
    });

    it('should throw error if session is missing', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: null },
        error: null
      });

      await expect(adapter.initialize()).rejects.toThrow();
    });

    it('should fetch tenant_id from profiles table', async () => {
      await adapter.initialize();
      expect(supabase.from).toHaveBeenCalledWith('profiles');
    });
  });

  describe('CRUD Operations', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });

    describe('create', () => {
      it('should create record with tenant_id', async () => {
        const mockData = { id: 'case-1', title: 'Test Case' };
        const mockInsert = vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: { ...mockData, tenant_id: mockTenantId },
              error: null
            }))
          }))
        }));

        (supabase.from as any).mockReturnValue({
          insert: mockInsert
        });

        const result = await adapter.create('cases', mockData);
        
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            ...mockData,
            tenant_id: mockTenantId
          })
        );
        expect(result).toHaveProperty('tenant_id', mockTenantId);
      });
    });

    describe('getAll', () => {
      it('should filter by tenant_id', async () => {
        const mockEq = vi.fn(() => Promise.resolve({
          data: [],
          error: null
        }));

        const mockSelect = vi.fn(() => ({
          eq: mockEq
        }));

        (supabase.from as any).mockReturnValue({
          select: mockSelect
        });

        await adapter.getAll('cases');
        
        expect(mockSelect).toHaveBeenCalledWith('*');
        expect(mockEq).toHaveBeenCalledWith('tenant_id', mockTenantId);
      });
    });

    describe('update', () => {
      it('should enforce tenant isolation in updates', async () => {
        const mockEq = vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: { id: 'case-1', title: 'Updated', tenant_id: mockTenantId },
                error: null
              }))
            }))
          }))
        }));

        (supabase.from as any).mockReturnValue({
          update: vi.fn(() => ({
            eq: mockEq
          }))
        });

        await adapter.update('cases', 'case-1', { title: 'Updated' } as any);
        
        expect(mockEq).toHaveBeenCalledWith('tenant_id', mockTenantId);
      });
    });

    describe('delete', () => {
      it('should enforce tenant isolation in deletes', async () => {
        const mockEq = vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }));

        (supabase.from as any).mockReturnValue({
          delete: vi.fn(() => ({
            eq: mockEq
          }))
        });

        await adapter.delete('cases', 'case-1');
        
        expect(mockEq).toHaveBeenCalledWith('tenant_id', mockTenantId);
      });
    });
  });

  describe('Tenant Isolation', () => {
    it('should prevent operations without initialization', async () => {
      const uninitializedAdapter = new SupabaseAdapter();
      
      await expect(
        uninitializedAdapter.create('cases', { id: 'test' })
      ).rejects.toThrow('not initialized');
    });

    it('should include tenant_id in all queries', async () => {
      await adapter.initialize();

      const mockEq = vi.fn(() => Promise.resolve({
        data: [],
        error: null
      }));

      (supabase.from as any).mockReturnValue({
        select: vi.fn(() => ({
          eq: mockEq
        }))
      });

      await adapter.getAll('cases');
      
      expect(mockEq).toHaveBeenCalledWith('tenant_id', mockTenantId);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });

    it('should handle duplicate key errors', async () => {
      (supabase.from as any).mockReturnValue({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: null,
              error: { code: '23505', message: 'Duplicate key' }
            }))
          }))
        }))
      });

      await expect(
        adapter.create('cases', { id: 'dup-1' })
      ).rejects.toThrow('already exists');
    });

    it('should handle foreign key violations', async () => {
      (supabase.from as any).mockReturnValue({
        delete: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({
              error: { code: '23503', message: 'Foreign key violation' }
            }))
          }))
        }))
      });

      await expect(
        adapter.delete('cases', 'case-1')
      ).rejects.toThrow('referenced');
    });

    it('should handle permission errors', async () => {
      (supabase.from as any).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({
            error: { code: '42501', message: 'Permission denied' }
          }))
        }))
      });

      await expect(
        adapter.getAll('cases')
      ).rejects.toThrow('Permission denied');
    });
  });

  describe('Health Check', () => {
    it('should return healthy status with valid session', async () => {
      await adapter.initialize();

      // Mock tenant query
      (supabase.from as any).mockReturnValue({
        select: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ error: null }))
        }))
      });

      const health = await adapter.healthCheck();
      
      expect(health.healthy).toBe(true);
      expect(health.errors).toHaveLength(0);
    });

    it('should detect session issues', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: null },
        error: null
      });

      const health = await adapter.healthCheck();
      
      expect(health.healthy).toBe(false);
      expect(health.errors).toContain('No active session');
    });
  });

  describe('Caching', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });

    it('should cache getAll results', async () => {
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({
          data: [{ id: '1' }],
          error: null
        }))
      }));

      (supabase.from as any).mockReturnValue({
        select: mockSelect
      });

      // First call
      await adapter.getAll('cases');
      expect(mockSelect).toHaveBeenCalledTimes(1);

      // Second call (should use cache)
      await adapter.getAll('cases');
      expect(mockSelect).toHaveBeenCalledTimes(1); // Not called again
    });

    it('should invalidate cache on mutations', async () => {
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({
          data: [],
          error: null
        }))
      }));

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: { id: 'new' },
              error: null
            }))
          }))
        }))
      });

      // Populate cache
      await adapter.getAll('cases');
      
      // Mutate
      await adapter.create('cases', { id: 'new' });
      
      // Query again (cache should be invalidated)
      await adapter.getAll('cases');
      
      expect(mockSelect).toHaveBeenCalledTimes(2);
    });
  });
});

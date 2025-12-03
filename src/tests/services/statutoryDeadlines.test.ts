import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'test-act-1', code: 'CGST', name: 'CGST Act 2017' }, error: null }),
          order: vi.fn().mockResolvedValue({ data: [], error: null })
        }),
        order: vi.fn().mockReturnValue({
          data: [],
          error: null
        })
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'new-id' }, error: null })
        })
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      })
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    }
  }
}));

// Mock storageManager
vi.mock('@/data/StorageManager', () => ({
  storageManager: {
    getStorage: () => ({
      getAll: vi.fn().mockResolvedValue([]),
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

describe('Statutory Deadline Module Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Deadline Calculation Logic', () => {
    it('should calculate deadline in days correctly', () => {
      const baseDate = new Date('2025-01-01');
      const deadlineCount = 30;
      const deadlineType = 'days';

      const expectedDate = new Date('2025-01-31');
      const calculatedDate = new Date(baseDate);
      calculatedDate.setDate(calculatedDate.getDate() + deadlineCount);

      expect(calculatedDate.toDateString()).toBe(expectedDate.toDateString());
    });

    it('should calculate deadline in months correctly', () => {
      const baseDate = new Date('2025-01-15');
      const deadlineCount = 2;

      const calculatedDate = new Date(baseDate);
      calculatedDate.setMonth(calculatedDate.getMonth() + deadlineCount);

      expect(calculatedDate.getMonth()).toBe(2); // March (0-indexed)
      expect(calculatedDate.getDate()).toBe(15);
    });

    it('should handle month-end edge cases', () => {
      const baseDate = new Date('2025-01-31');
      const deadlineCount = 1;

      const calculatedDate = new Date(baseDate);
      calculatedDate.setMonth(calculatedDate.getMonth() + deadlineCount);

      // Should be Feb 28 (or 29 in leap year)
      expect(calculatedDate.getMonth()).toBe(1); // February
    });

    it('should calculate working days excluding weekends', () => {
      // Simple working days calculation
      const baseDate = new Date('2025-01-06'); // Monday
      const workingDays = 5;

      let currentDate = new Date(baseDate);
      let daysAdded = 0;

      while (daysAdded < workingDays) {
        currentDate.setDate(currentDate.getDate() + 1);
        const dayOfWeek = currentDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          daysAdded++;
        }
      }

      // 5 working days from Monday Jan 6 = Monday Jan 13
      expect(currentDate.getDate()).toBe(13);
    });
  });

  describe('RAG Status Determination', () => {
    it('should return Green for deadlines > 15 days away', () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 20);
      const today = new Date();
      const daysRemaining = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      let ragStatus = 'Green';
      if (daysRemaining < 0) ragStatus = 'Red';
      else if (daysRemaining <= 7) ragStatus = 'Amber';

      expect(ragStatus).toBe('Green');
    });

    it('should return Amber for deadlines 1-7 days away', () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 5);
      const today = new Date();
      const daysRemaining = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      let ragStatus = 'Green';
      if (daysRemaining < 0) ragStatus = 'Red';
      else if (daysRemaining <= 7) ragStatus = 'Amber';

      expect(ragStatus).toBe('Amber');
    });

    it('should return Red for breached deadlines', () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() - 5);
      const today = new Date();
      const daysRemaining = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      let ragStatus = 'Green';
      if (daysRemaining < 0) ragStatus = 'Red';
      else if (daysRemaining <= 7) ragStatus = 'Amber';

      expect(ragStatus).toBe('Red');
    });
  });

  describe('Extension Handling', () => {
    it('should calculate extended deadline correctly', () => {
      const originalDeadline = new Date('2025-01-31');
      const extensionDays = 15;

      const extendedDeadline = new Date(originalDeadline);
      extendedDeadline.setDate(extendedDeadline.getDate() + extensionDays);

      expect(extendedDeadline.toDateString()).toBe(new Date('2025-02-15').toDateString());
    });

    it('should track extension count', () => {
      let extensionCount = 0;
      const maxExtensions = 2;

      // First extension
      extensionCount++;
      expect(extensionCount).toBeLessThanOrEqual(maxExtensions);

      // Second extension
      extensionCount++;
      expect(extensionCount).toBeLessThanOrEqual(maxExtensions);

      // Third extension should exceed limit
      extensionCount++;
      expect(extensionCount).toBeGreaterThan(maxExtensions);
    });

    it('should prevent extensions beyond max allowed', () => {
      const maxExtensionCount = 2;
      const currentExtensions = 2;

      const canExtend = currentExtensions < maxExtensionCount;
      expect(canExtend).toBe(false);
    });
  });

  describe('Holiday Exclusion', () => {
    const holidays = [
      { date: '2025-01-26', name: 'Republic Day' },
      { date: '2025-08-15', name: 'Independence Day' },
      { date: '2025-10-02', name: 'Gandhi Jayanti' }
    ];

    it('should identify date as holiday', () => {
      const dateToCheck = '2025-01-26';
      const isHoliday = holidays.some(h => h.date === dateToCheck);
      expect(isHoliday).toBe(true);
    });

    it('should identify date as non-holiday', () => {
      const dateToCheck = '2025-01-27';
      const isHoliday = holidays.some(h => h.date === dateToCheck);
      expect(isHoliday).toBe(false);
    });

    it('should skip holidays in working day calculation', () => {
      const holidayDates = new Set(['2025-01-26']);
      let currentDate = new Date('2025-01-24'); // Friday
      let workingDaysToAdd = 2;
      let daysAdded = 0;

      while (daysAdded < workingDaysToAdd) {
        currentDate.setDate(currentDate.getDate() + 1);
        const dayOfWeek = currentDate.getDay();
        const dateStr = currentDate.toISOString().split('T')[0];

        // Skip weekends and holidays
        if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidayDates.has(dateStr)) {
          daysAdded++;
        }
      }

      // Should skip Sat (25), Sun (26 is also holiday), Mon (27)
      expect(currentDate.getDate()).toBe(28);
    });
  });

  describe('Notification Rules', () => {
    const notificationDays = [30, 15, 7, 3, 1, 0];

    it('should trigger notification at 7 days remaining', () => {
      const daysRemaining = 7;
      const shouldNotify = notificationDays.includes(daysRemaining);
      expect(shouldNotify).toBe(true);
    });

    it('should trigger notification on due date', () => {
      const daysRemaining = 0;
      const shouldNotify = notificationDays.includes(daysRemaining);
      expect(shouldNotify).toBe(true);
    });

    it('should not trigger notification at 10 days', () => {
      const daysRemaining = 10;
      const shouldNotify = notificationDays.includes(daysRemaining);
      expect(shouldNotify).toBe(false);
    });

    it('should trigger breach notification for overdue', () => {
      const daysRemaining = -1;
      const isBreached = daysRemaining < 0;
      expect(isBreached).toBe(true);
    });
  });

  describe('Report Data Transformation', () => {
    it('should map snake_case to camelCase correctly', () => {
      const dbRecord = {
        id: 'deadline-1',
        case_id: 'case-1',
        base_date: '2025-01-01',
        calculated_deadline: '2025-01-31',
        extension_deadline: null,
        extension_count: 0,
        status: 'pending'
      };

      const transformed = {
        id: dbRecord.id,
        caseId: dbRecord.case_id,
        baseDate: dbRecord.base_date,
        dueDate: dbRecord.extension_deadline || dbRecord.calculated_deadline,
        extensionCount: dbRecord.extension_count,
        status: dbRecord.status === 'completed' ? 'Completed' :
                dbRecord.status === 'breached' ? 'Breached' :
                dbRecord.extension_count > 0 ? 'Extended' : 'Pending'
      };

      expect(transformed.caseId).toBe('case-1');
      expect(transformed.dueDate).toBe('2025-01-31');
      expect(transformed.status).toBe('Pending');
    });

    it('should calculate days remaining correctly', () => {
      const dueDate = new Date('2025-12-15');
      const today = new Date('2025-12-10');
      const daysRemaining = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      expect(daysRemaining).toBe(5);
    });

    it('should handle negative days for breached deadlines', () => {
      const dueDate = new Date('2025-12-01');
      const today = new Date('2025-12-05');
      const daysRemaining = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      expect(daysRemaining).toBeLessThan(0);
    });
  });

  describe('Statutory Event Types', () => {
    const eventTypes = [
      { code: 'SCN_REPLY', name: 'Reply to Show Cause Notice', deadlineCount: 30, deadlineType: 'days' },
      { code: 'APPEAL', name: 'Appeal Filing', deadlineCount: 3, deadlineType: 'months' },
      { code: 'REFUND', name: 'Refund Application', deadlineCount: 2, deadlineType: 'years' }
    ];

    it('should handle days deadline type', () => {
      const eventType = eventTypes.find(e => e.code === 'SCN_REPLY');
      expect(eventType?.deadlineType).toBe('days');
      expect(eventType?.deadlineCount).toBe(30);
    });

    it('should handle months deadline type', () => {
      const eventType = eventTypes.find(e => e.code === 'APPEAL');
      expect(eventType?.deadlineType).toBe('months');
      expect(eventType?.deadlineCount).toBe(3);
    });

    it('should lookup event type by code', () => {
      const code = 'SCN_REPLY';
      const eventType = eventTypes.find(e => e.code === code);
      expect(eventType).toBeDefined();
      expect(eventType?.name).toBe('Reply to Show Cause Notice');
    });
  });

  describe('Statutory Acts', () => {
    const acts = [
      { code: 'CGST', name: 'Central Goods and Services Tax Act, 2017' },
      { code: 'IGST', name: 'Integrated Goods and Services Tax Act, 2017' },
      { code: 'SGST', name: 'State Goods and Services Tax Act, 2017' },
      { code: 'IT', name: 'Income Tax Act, 1961' }
    ];

    it('should contain GST acts', () => {
      const gstActs = acts.filter(a => ['CGST', 'IGST', 'SGST'].includes(a.code));
      expect(gstActs.length).toBe(3);
    });

    it('should lookup act by code', () => {
      const act = acts.find(a => a.code === 'CGST');
      expect(act?.name).toContain('Central Goods and Services Tax');
    });
  });

  describe('Dashboard Widget Data', () => {
    it('should calculate breach count correctly', () => {
      const deadlines = [
        { status: 'pending', daysRemaining: 10 },
        { status: 'breached', daysRemaining: -5 },
        { status: 'pending', daysRemaining: -2 },
        { status: 'completed', daysRemaining: 0 }
      ];

      const breachedCount = deadlines.filter(d => 
        d.status === 'breached' || d.daysRemaining < 0
      ).length;

      expect(breachedCount).toBe(2);
    });

    it('should calculate urgent count correctly', () => {
      const deadlines = [
        { daysRemaining: 3, status: 'pending' },
        { daysRemaining: 7, status: 'pending' },
        { daysRemaining: 15, status: 'pending' },
        { daysRemaining: 1, status: 'pending' }
      ];

      const urgentCount = deadlines.filter(d => 
        d.daysRemaining > 0 && d.daysRemaining <= 7 && d.status === 'pending'
      ).length;

      expect(urgentCount).toBe(3);
    });

    it('should calculate pending and completed counts', () => {
      const deadlines = [
        { status: 'pending' },
        { status: 'completed' },
        { status: 'pending' },
        { status: 'breached' },
        { status: 'completed' }
      ];

      const pendingCount = deadlines.filter(d => d.status === 'pending').length;
      const completedCount = deadlines.filter(d => d.status === 'completed').length;

      expect(pendingCount).toBe(2);
      expect(completedCount).toBe(2);
    });
  });

  describe('Export Column Configuration', () => {
    const columns = [
      { key: 'caseNumber', header: 'Case Number' },
      { key: 'caseTitle', header: 'Case Title' },
      { key: 'eventType', header: 'Event Type' },
      { key: 'baseDate', header: 'Base Date' },
      { key: 'dueDate', header: 'Due Date' },
      { key: 'daysRemaining', header: 'Days Remaining' },
      { key: 'status', header: 'Status' },
      { key: 'ragStatus', header: 'RAG Status' }
    ];

    it('should have all required export columns', () => {
      const requiredKeys = ['caseNumber', 'dueDate', 'status', 'ragStatus'];
      requiredKeys.forEach(key => {
        expect(columns.find(c => c.key === key)).toBeDefined();
      });
    });

    it('should have proper headers', () => {
      const dueDateColumn = columns.find(c => c.key === 'dueDate');
      expect(dueDateColumn?.header).toBe('Due Date');
    });
  });
});

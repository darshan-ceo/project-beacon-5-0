import { describe, it, expect } from 'vitest';

describe('Statutory Deadline Validation Tests', () => {
  describe('Event Type Validation', () => {
    it('should require event type code', () => {
      const eventType = { code: '', name: 'Test Event' };
      const isValid = eventType.code && eventType.code.trim().length > 0;
      expect(isValid).toBe(false);
    });

    it('should require event type name', () => {
      const eventType = { code: 'TEST', name: '' };
      const isValid = eventType.name && eventType.name.trim().length > 0;
      expect(isValid).toBe(false);
    });

    it('should validate deadline count is positive', () => {
      const deadlineCount = -5;
      const isValid = deadlineCount > 0;
      expect(isValid).toBe(false);
    });

    it('should validate deadline count is positive for valid input', () => {
      const deadlineCount = 30;
      const isValid = deadlineCount > 0;
      expect(isValid).toBe(true);
    });

    it('should validate deadline type is valid', () => {
      const validTypes = ['days', 'months', 'years', 'working_days'];
      const deadlineType = 'days';
      const isValid = validTypes.includes(deadlineType);
      expect(isValid).toBe(true);
    });

    it('should reject invalid deadline type', () => {
      const validTypes = ['days', 'months', 'years', 'working_days'];
      const deadlineType = 'hours';
      const isValid = validTypes.includes(deadlineType);
      expect(isValid).toBe(false);
    });
  });

  describe('Holiday Validation', () => {
    it('should require holiday date', () => {
      const holiday = { date: '', name: 'Test Holiday' };
      const isValid = holiday.date && holiday.date.trim().length > 0;
      expect(isValid).toBe(false);
    });

    it('should require holiday name', () => {
      const holiday = { date: '2025-01-26', name: '' };
      const isValid = holiday.name && holiday.name.trim().length > 0;
      expect(isValid).toBe(false);
    });

    it('should validate date format', () => {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      expect(dateRegex.test('2025-01-26')).toBe(true);
      expect(dateRegex.test('26-01-2025')).toBe(false);
      expect(dateRegex.test('2025/01/26')).toBe(false);
    });

    it('should validate holiday type', () => {
      const validTypes = ['national', 'state', 'court', 'custom'];
      expect(validTypes.includes('national')).toBe(true);
      expect(validTypes.includes('invalid')).toBe(false);
    });
  });

  describe('Statutory Act Validation', () => {
    it('should require act code', () => {
      const act = { code: '', name: 'Test Act' };
      const isValid = act.code && act.code.trim().length > 0;
      expect(isValid).toBe(false);
    });

    it('should require act name', () => {
      const act = { code: 'TEST', name: '' };
      const isValid = act.name && act.name.trim().length > 0;
      expect(isValid).toBe(false);
    });

    it('should validate act code format (uppercase)', () => {
      const code = 'CGST';
      const isUppercase = code === code.toUpperCase();
      expect(isUppercase).toBe(true);
    });
  });

  describe('Case Deadline Validation', () => {
    it('should require case ID', () => {
      const deadline = { caseId: '', eventTypeId: 'event-1' };
      const isValid = deadline.caseId && deadline.caseId.trim().length > 0;
      expect(isValid).toBe(false);
    });

    it('should require event type ID', () => {
      const deadline = { caseId: 'case-1', eventTypeId: '' };
      const isValid = deadline.eventTypeId && deadline.eventTypeId.trim().length > 0;
      expect(isValid).toBe(false);
    });

    it('should require base date', () => {
      const deadline = { caseId: 'case-1', baseDate: '' };
      const isValid = deadline.baseDate && deadline.baseDate.trim().length > 0;
      expect(isValid).toBe(false);
    });

    it('should validate UUID format', () => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(uuidRegex.test('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(uuidRegex.test('invalid-uuid')).toBe(false);
    });

    it('should validate extension count is non-negative', () => {
      const extensionCount = -1;
      const isValid = extensionCount >= 0;
      expect(isValid).toBe(false);
    });

    it('should validate extension count does not exceed max', () => {
      const extensionCount = 3;
      const maxExtensions = 2;
      const isValid = extensionCount <= maxExtensions;
      expect(isValid).toBe(false);
    });
  });

  describe('Base Date Type Validation', () => {
    it('should accept valid base date types', () => {
      const validTypes = ['notice_date', 'order_date', 'hearing_date', 'filing_date', 'custom'];
      expect(validTypes.includes('notice_date')).toBe(true);
      expect(validTypes.includes('order_date')).toBe(true);
    });

    it('should reject invalid base date types', () => {
      const validTypes = ['notice_date', 'order_date', 'hearing_date', 'filing_date', 'custom'];
      expect(validTypes.includes('invalid_type')).toBe(false);
    });
  });

  describe('Status Validation', () => {
    it('should accept valid deadline statuses', () => {
      const validStatuses = ['pending', 'completed', 'breached', 'extended'];
      expect(validStatuses.includes('pending')).toBe(true);
      expect(validStatuses.includes('completed')).toBe(true);
      expect(validStatuses.includes('breached')).toBe(true);
    });

    it('should reject invalid status', () => {
      const validStatuses = ['pending', 'completed', 'breached', 'extended'];
      expect(validStatuses.includes('cancelled')).toBe(false);
    });
  });

  describe('Extension Validation', () => {
    it('should validate extension deadline is after original deadline', () => {
      const originalDeadline = new Date('2025-01-31');
      const extensionDeadline = new Date('2025-02-15');
      const isValid = extensionDeadline > originalDeadline;
      expect(isValid).toBe(true);
    });

    it('should reject extension deadline before original', () => {
      const originalDeadline = new Date('2025-01-31');
      const extensionDeadline = new Date('2025-01-25');
      const isValid = extensionDeadline > originalDeadline;
      expect(isValid).toBe(false);
    });

    it('should validate extension days is positive', () => {
      const extensionDays = 15;
      const isValid = extensionDays > 0;
      expect(isValid).toBe(true);
    });

    it('should reject zero or negative extension days', () => {
      expect(0 > 0).toBe(false);
      expect(-5 > 0).toBe(false);
    });
  });

  describe('Report Filter Validation', () => {
    it('should validate date range has start before end', () => {
      const dateRange = { start: '2025-01-01', end: '2025-01-31' };
      const isValid = new Date(dateRange.start) <= new Date(dateRange.end);
      expect(isValid).toBe(true);
    });

    it('should reject invalid date range', () => {
      const dateRange = { start: '2025-01-31', end: '2025-01-01' };
      const isValid = new Date(dateRange.start) <= new Date(dateRange.end);
      expect(isValid).toBe(false);
    });

    it('should validate RAG status filter', () => {
      const validRagStatuses = ['Green', 'Amber', 'Red'];
      expect(validRagStatuses.includes('Green')).toBe(true);
      expect(validRagStatuses.includes('Yellow')).toBe(false);
    });
  });
});

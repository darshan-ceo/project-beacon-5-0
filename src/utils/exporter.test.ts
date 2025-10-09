/**
 * Unit Tests for Universal Exporter
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  getNestedValue, 
  formatValue, 
  extractCellValue,
  generateFilename,
  rowsToSheetData
} from './exporter';
import { ExportColumn } from '@/config/exports';

describe('Exporter Utils', () => {
  describe('getNestedValue', () => {
    it('should resolve simple nested paths', () => {
      const obj = {
        user: {
          name: 'John Doe',
          email: 'john@example.com'
        }
      };
      
      expect(getNestedValue(obj, 'user.name')).toBe('John Doe');
      expect(getNestedValue(obj, 'user.email')).toBe('john@example.com');
    });
    
    it('should resolve deeply nested paths', () => {
      const obj = {
        client: {
          address: {
            city: 'Mumbai',
            state: 'Maharashtra'
          }
        }
      };
      
      expect(getNestedValue(obj, 'client.address.city')).toBe('Mumbai');
      expect(getNestedValue(obj, 'client.address.state')).toBe('Maharashtra');
    });
    
    it('should resolve array index notation', () => {
      const obj = {
        signatories: [
          { name: 'Alice', email: 'alice@example.com' },
          { name: 'Bob', email: 'bob@example.com' }
        ]
      };
      
      expect(getNestedValue(obj, 'signatories[0].name')).toBe('Alice');
      expect(getNestedValue(obj, 'signatories[1].email')).toBe('bob@example.com');
    });
    
    it('should return undefined for non-existent paths', () => {
      const obj = { user: { name: 'John' } };
      
      expect(getNestedValue(obj, 'user.age')).toBeUndefined();
      expect(getNestedValue(obj, 'address.city')).toBeUndefined();
    });
    
    it('should handle null/undefined objects safely', () => {
      expect(getNestedValue(null, 'user.name')).toBeUndefined();
      expect(getNestedValue(undefined, 'user.name')).toBeUndefined();
    });
  });
  
  describe('formatValue', () => {
    describe('date formatting', () => {
      it('should format dates in dd-MM-yyyy format by default', () => {
        const date = '2024-03-15T10:30:00Z';
        const formatted = formatValue(date, 'date');
        expect(formatted).toBe('15-03-2024');
      });
      
      it('should use custom date format if provided', () => {
        const date = '2024-03-15T10:30:00Z';
        const formatted = formatValue(date, 'date', 'yyyy-MM-dd');
        expect(formatted).toBe('2024-03-15');
      });
      
      it('should handle Date objects', () => {
        const date = new Date('2024-03-15T10:30:00Z');
        const formatted = formatValue(date, 'date');
        expect(formatted).toBe('15-03-2024');
      });
      
      it('should return N/A for invalid dates', () => {
        expect(formatValue('invalid-date', 'date')).toBe('N/A');
        expect(formatValue(null, 'date')).toBe('N/A');
        expect(formatValue(undefined, 'date')).toBe('N/A');
      });
    });
    
    describe('currency formatting', () => {
      it('should format currency with INR symbol', () => {
        const formatted = formatValue(1000, 'currency');
        expect(formatted).toContain('₹');
        expect(formatted).toContain('1,000');
      });
      
      it('should format currency with proper decimals', () => {
        const formatted = formatValue(1234.56, 'currency');
        expect(formatted).toContain('1,234.56');
      });
      
      it('should return N/A for non-numeric currency values', () => {
        expect(formatValue('abc', 'currency')).toBe('N/A');
        expect(formatValue(null, 'currency')).toBe('N/A');
      });
    });
    
    describe('phone formatting', () => {
      it('should format 10-digit Indian phone numbers', () => {
        const formatted = formatValue('9876543210', 'phone');
        expect(formatted).toBe('+91 98765 43210');
      });
      
      it('should handle phone numbers with non-digit characters', () => {
        const formatted = formatValue('+91-98765-43210', 'phone');
        expect(formatted).toBe('+91 98765 43210');
      });
      
      it('should return N/A for empty phone values', () => {
        expect(formatValue('', 'phone')).toBe('N/A');
        expect(formatValue(null, 'phone')).toBe('N/A');
      });
    });
    
    describe('email formatting', () => {
      it('should trim and return email addresses', () => {
        expect(formatValue('  test@example.com  ', 'email')).toBe('test@example.com');
      });
      
      it('should return N/A for empty emails', () => {
        expect(formatValue('', 'email')).toBe('N/A');
        expect(formatValue(null, 'email')).toBe('N/A');
      });
    });
    
    describe('number formatting', () => {
      it('should convert numbers to strings', () => {
        expect(formatValue(42, 'number')).toBe('42');
        expect(formatValue(3.14, 'number')).toBe('3.14');
      });
      
      it('should return N/A for non-numeric values', () => {
        expect(formatValue('abc', 'number')).toBe('N/A');
        expect(formatValue(null, 'number')).toBe('N/A');
      });
    });
    
    describe('boolean formatting', () => {
      it('should format booleans as Yes/No', () => {
        expect(formatValue(true, 'boolean')).toBe('Yes');
        expect(formatValue(false, 'boolean')).toBe('No');
      });
    });
    
    describe('string formatting', () => {
      it('should trim strings', () => {
        expect(formatValue('  Hello World  ', 'string')).toBe('Hello World');
      });
      
      it('should return N/A for empty strings', () => {
        expect(formatValue('', 'string')).toBe('N/A');
        expect(formatValue(null, 'string')).toBe('N/A');
      });
    });
  });
  
  describe('extractCellValue', () => {
    it('should use custom getter if provided', () => {
      const row = { firstName: 'John', lastName: 'Doe' };
      const column: ExportColumn = {
        key: 'fullName',
        label: 'Full Name',
        get: (row) => `${row.firstName} ${row.lastName}`
      };
      
      const value = extractCellValue(row, column);
      expect(value).toBe('John Doe');
    });
    
    it('should resolve nested paths when no getter provided', () => {
      const row = {
        client: {
          name: 'TechCorp'
        }
      };
      const column: ExportColumn = {
        key: 'client.name',
        label: 'Client Name',
        type: 'string'
      };
      
      const value = extractCellValue(row, column);
      expect(value).toBe('TechCorp');
    });
    
    it('should apply formatters based on type', () => {
      const row = { amount: 1000 };
      const column: ExportColumn = {
        key: 'amount',
        label: 'Amount',
        type: 'currency'
      };
      
      const value = extractCellValue(row, column);
      expect(value).toContain('₹');
      expect(value).toContain('1,000');
    });
    
    it('should pass context to custom getters', () => {
      const row = { clientId: 'CLT-001' };
      const context: any = {
        clients: [
          { id: 'CLT-001', name: 'Acme Corp' },
          { id: 'CLT-002', name: 'Tech Inc' }
        ]
      };
      const column: ExportColumn = {
        key: 'clientName',
        label: 'Client Name',
        get: (row, ctx) => {
          const client = ctx?.clients?.find((c: any) => c.id === row.clientId);
          return client?.name || 'Unknown';
        }
      };
      
      const value = extractCellValue(row, column, context);
      expect(value).toBe('Acme Corp');
    });
  });
  
  describe('generateFilename', () => {
    it('should generate timestamped filenames for xlsx', () => {
      const filename = generateFilename('Clients', 'xlsx');
      expect(filename).toMatch(/^Clients-\d{4}-\d{2}-\d{2}-\d{4}\.xlsx$/);
    });
    
    it('should generate timestamped filenames for csv', () => {
      const filename = generateFilename('Cases', 'csv');
      expect(filename).toMatch(/^Cases-\d{4}-\d{2}-\d{2}-\d{4}\.csv$/);
    });
  });
  
  describe('rowsToSheetData', () => {
    const columns: ExportColumn[] = [
      { key: 'name', label: 'Name', type: 'string' },
      { key: 'email', label: 'Email', type: 'email' }
    ];
    
    it('should include headers by default', () => {
      const rows = [
        { name: 'John Doe', email: 'john@example.com' }
      ];
      
      const sheetData = rowsToSheetData(rows, columns);
      
      expect(sheetData[0]).toEqual(['Name', 'Email']);
      expect(sheetData[1]).toEqual(['John Doe', 'john@example.com']);
    });
    
    it('should exclude headers when includeHeader is false', () => {
      const rows = [
        { name: 'John Doe', email: 'john@example.com' }
      ];
      
      const sheetData = rowsToSheetData(rows, columns, undefined, false);
      
      expect(sheetData[0]).toEqual(['John Doe', 'john@example.com']);
    });
    
    it('should handle empty dataset with headers', () => {
      const rows: any[] = [];
      
      const sheetData = rowsToSheetData(rows, columns);
      
      expect(sheetData).toHaveLength(1);
      expect(sheetData[0]).toEqual(['Name', 'Email']);
    });
    
    it('should handle multiple rows', () => {
      const rows = [
        { name: 'John Doe', email: 'john@example.com' },
        { name: 'Jane Smith', email: 'jane@example.com' }
      ];
      
      const sheetData = rowsToSheetData(rows, columns);
      
      expect(sheetData).toHaveLength(3); // 1 header + 2 rows
      expect(sheetData[1]).toEqual(['John Doe', 'john@example.com']);
      expect(sheetData[2]).toEqual(['Jane Smith', 'jane@example.com']);
    });
  });
});

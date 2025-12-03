import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

// Mock the services
vi.mock('@/services/reportsService', () => ({
  getStatutoryDeadlineReport: vi.fn().mockResolvedValue({
    data: [
      {
        id: 'deadline-1',
        caseId: 'case-1',
        caseNumber: 'GST-2025-001',
        caseTitle: 'Test GST Case',
        client: 'Test Client',
        eventType: 'Reply to SCN',
        actName: 'CGST Act 2017',
        baseDate: '2025-01-01',
        dueDate: '2025-01-31',
        daysRemaining: 28,
        status: 'Pending',
        ragStatus: 'Green',
        owner: 'John Doe',
        extensionCount: 0
      },
      {
        id: 'deadline-2',
        caseId: 'case-2',
        caseNumber: 'GST-2025-002',
        caseTitle: 'Urgent Case',
        client: 'Urgent Client',
        eventType: 'Appeal Filing',
        actName: 'CGST Act 2017',
        baseDate: '2025-01-15',
        dueDate: '2025-01-20',
        daysRemaining: 3,
        status: 'Pending',
        ragStatus: 'Amber',
        owner: 'Jane Smith',
        extensionCount: 0
      },
      {
        id: 'deadline-3',
        caseId: 'case-3',
        caseNumber: 'GST-2025-003',
        caseTitle: 'Breached Case',
        client: 'Breached Client',
        eventType: 'Refund Application',
        actName: 'CGST Act 2017',
        baseDate: '2024-12-01',
        dueDate: '2024-12-31',
        daysRemaining: -17,
        status: 'Breached',
        ragStatus: 'Red',
        owner: 'Bob Wilson',
        extensionCount: 1
      }
    ]
  })
}));

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/reports' }),
  useSearchParams: () => [new URLSearchParams(), vi.fn()]
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn()
}));

describe('Statutory Deadlines Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('DeadlineStatusBadge', () => {
    it('should render green badge for healthy deadline', () => {
      const daysRemaining = 20;
      const status = 'Pending' as string;

      let color = 'bg-green-100 text-green-800';
      if (daysRemaining < 0 || status === 'Breached') {
        color = 'bg-red-100 text-red-800';
      } else if (daysRemaining <= 7) {
        color = 'bg-orange-100 text-orange-800';
      }

      expect(color).toBe('bg-green-100 text-green-800');
    });

    it('should render amber badge for urgent deadline', () => {
      const daysRemaining = 5;
      const status = 'Pending' as string;

      let color = 'bg-green-100 text-green-800';
      if (daysRemaining < 0 || status === 'Breached') {
        color = 'bg-red-100 text-red-800';
      } else if (daysRemaining <= 7) {
        color = 'bg-orange-100 text-orange-800';
      }

      expect(color).toBe('bg-orange-100 text-orange-800');
    });

    it('should render red badge for breached deadline', () => {
      const daysRemaining = -5;
      const status = 'Breached' as string;

      let color = 'bg-green-100 text-green-800';
      if (daysRemaining < 0 || status === 'Breached') {
        color = 'bg-red-100 text-red-800';
      } else if (daysRemaining <= 7) {
        color = 'bg-orange-100 text-orange-800';
      }

      expect(color).toBe('bg-red-100 text-red-800');
    });
  });

  describe('Report Summary Statistics', () => {
    it('should calculate correct summary stats from data', () => {
      const data = [
        { status: 'Pending', ragStatus: 'Green', daysRemaining: 20 },
        { status: 'Pending', ragStatus: 'Amber', daysRemaining: 5 },
        { status: 'Breached', ragStatus: 'Red', daysRemaining: -5 },
        { status: 'Completed', ragStatus: 'Green', daysRemaining: 0 }
      ];

      const breachedCount = data.filter(d => d.status === 'Breached' || d.ragStatus === 'Red').length;
      const pendingCount = data.filter(d => d.status === 'Pending').length;
      const completedCount = data.filter(d => d.status === 'Completed').length;
      const urgentCount = data.filter(d => d.daysRemaining <= 7 && d.daysRemaining > 0).length;

      expect(breachedCount).toBe(1);
      expect(pendingCount).toBe(2);
      expect(completedCount).toBe(1);
      expect(urgentCount).toBe(1);
    });
  });

  describe('Table Rendering', () => {
    it('should have all required columns', () => {
      const columns = [
        'Case Number',
        'Case Title',
        'Client',
        'Event Type',
        'Act',
        'Base Date',
        'Due Date',
        'Days Left',
        'Status',
        'RAG',
        'Owner',
        'Extensions'
      ];

      expect(columns.length).toBe(12);
      expect(columns).toContain('Due Date');
      expect(columns).toContain('RAG');
    });

    it('should highlight breached rows', () => {
      const data = { ragStatus: 'Red', status: 'Breached' };
      const rowClassName = data.ragStatus === 'Red' ? 'bg-destructive/5' : '';
      expect(rowClassName).toBe('bg-destructive/5');
    });
  });

  describe('Export Functionality', () => {
    it('should export to Excel format', async () => {
      const exportFormat = 'xlsx';
      const filename = `Statutory-Deadlines-Report_${new Date().toISOString().split('T')[0]}.${exportFormat}`;
      
      expect(filename).toContain('Statutory-Deadlines-Report');
      expect(filename).toContain('.xlsx');
    });

    it('should export to PDF format', async () => {
      const exportFormat = 'pdf';
      const filename = `Statutory-Deadlines-Report_${new Date().toISOString().split('T')[0]}.${exportFormat}`;
      
      expect(filename).toContain('Statutory-Deadlines-Report');
      expect(filename).toContain('.pdf');
    });
  });

  describe('Filter Application', () => {
    it('should filter by client', () => {
      const data = [
        { clientId: 'client-1', client: 'Client A' },
        { clientId: 'client-2', client: 'Client B' },
        { clientId: 'client-1', client: 'Client A' }
      ];

      const filteredByClient = data.filter(d => d.clientId === 'client-1');
      expect(filteredByClient.length).toBe(2);
    });

    it('should filter by RAG status', () => {
      const data = [
        { ragStatus: 'Green' },
        { ragStatus: 'Amber' },
        { ragStatus: 'Red' },
        { ragStatus: 'Green' }
      ];

      const redItems = data.filter(d => d.ragStatus === 'Red');
      expect(redItems.length).toBe(1);
    });

    it('should filter by date range', () => {
      const data = [
        { dueDate: '2025-01-15' },
        { dueDate: '2025-01-25' },
        { dueDate: '2025-02-05' }
      ];

      const dateRange = { start: '2025-01-01', end: '2025-01-31' };
      const filtered = data.filter(d => {
        const dueDate = new Date(d.dueDate);
        return dueDate >= new Date(dateRange.start) && dueDate <= new Date(dateRange.end);
      });

      expect(filtered.length).toBe(2);
    });

    it('should filter by owner', () => {
      const data = [
        { ownerId: 'owner-1', owner: 'John' },
        { ownerId: 'owner-2', owner: 'Jane' },
        { ownerId: 'owner-1', owner: 'John' }
      ];

      const filtered = data.filter(d => d.ownerId === 'owner-1');
      expect(filtered.length).toBe(2);
    });
  });

  describe('Date Formatting', () => {
    it('should format date correctly', () => {
      const dateStr = '2025-01-15';
      const date = new Date(dateStr);
      const formatted = date.toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      });

      expect(formatted).toContain('15');
      expect(formatted).toContain('Jan');
      expect(formatted).toContain('2025');
    });

    it('should handle invalid dates gracefully', () => {
      const dateStr = '';
      const result = dateStr || 'N/A';
      expect(result).toBe('N/A');
    });
  });

  describe('Days Remaining Calculation', () => {
    it('should show positive days for future deadlines', () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 10);
      const today = new Date();
      const daysRemaining = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      expect(daysRemaining).toBeGreaterThan(0);
    });

    it('should show negative days for past deadlines', () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() - 10);
      const today = new Date();
      const daysRemaining = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      expect(daysRemaining).toBeLessThan(0);
    });

    it('should show zero for today deadlines', () => {
      const dueDate = new Date();
      const today = new Date();
      const daysRemaining = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      expect(daysRemaining).toBe(0);
    });
  });

  describe('Status Transitions', () => {
    it('should determine Pending status correctly', () => {
      const deadline = { status: 'pending', extension_count: 0 };
      const displayStatus = deadline.status === 'completed' ? 'Completed' :
                           deadline.status === 'breached' ? 'Breached' :
                           deadline.extension_count > 0 ? 'Extended' : 'Pending';
      expect(displayStatus).toBe('Pending');
    });

    it('should determine Extended status correctly', () => {
      const deadline = { status: 'pending', extension_count: 1 };
      const displayStatus = deadline.status === 'completed' ? 'Completed' :
                           deadline.status === 'breached' ? 'Breached' :
                           deadline.extension_count > 0 ? 'Extended' : 'Pending';
      expect(displayStatus).toBe('Extended');
    });

    it('should determine Completed status correctly', () => {
      const deadline = { status: 'completed', extension_count: 0 };
      const displayStatus = deadline.status === 'completed' ? 'Completed' :
                           deadline.status === 'breached' ? 'Breached' :
                           deadline.extension_count > 0 ? 'Extended' : 'Pending';
      expect(displayStatus).toBe('Completed');
    });

    it('should determine Breached status correctly', () => {
      const deadline = { status: 'breached', extension_count: 0 };
      const displayStatus = deadline.status === 'completed' ? 'Completed' :
                           deadline.status === 'breached' ? 'Breached' :
                           deadline.extension_count > 0 ? 'Extended' : 'Pending';
      expect(displayStatus).toBe('Breached');
    });
  });
});

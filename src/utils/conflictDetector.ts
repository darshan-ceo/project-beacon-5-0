import { HearingConflict } from '@/types/hearings';

interface ConflictCheckData {
  case_id: string;
  date: string;
  start_time: string;
  end_time?: string;
  judge_ids: string[];
  court_id: string;
  courtroom?: string;
  internal_counsel_ids?: string[];
}

export const conflictDetector = {
  /**
   * Check for conflicts in hearing scheduling
   * Returns soft warnings that don't block saving
   */
  async checkConflicts(hearingData: ConflictCheckData): Promise<HearingConflict[]> {
    const conflicts: HearingConflict[] = [];
    
    try {
      // Mock conflict detection for development
      // In production, this would check against the backend API
      
      const { date, start_time, judge_ids, court_id, courtroom, internal_counsel_ids } = hearingData;
      
      // Simulate some conflicts for demonstration
      const mockConflicts = this.getMockConflicts(hearingData);
      
      // Check for counsel conflicts
      if (judge_ids.length > 0) {
        const counselConflicts = mockConflicts.filter(c => 
          c.conflict_type === 'counsel_overlap' && 
          judge_ids.some(judgeId => c.counsel_id === judgeId)
        );
        conflicts.push(...counselConflicts);
      }
      
      // Check for court conflicts
      if (court_id && courtroom) {
        const courtConflicts = mockConflicts.filter(c => 
          c.conflict_type === 'court_overlap' && 
          c.counsel_id === `${court_id}-${courtroom}`
        );
        conflicts.push(...courtConflicts);
      }
      
      return conflicts;
      
    } catch (error) {
      console.error('Failed to check conflicts:', error);
      return [];
    }
  },

  /**
   * Mock conflict data for development
   */
  getMockConflicts(hearingData: ConflictCheckData): HearingConflict[] {
    const { date, start_time } = hearingData;
    
    // Only return conflicts for specific test scenarios
    if (date === '2024-03-15' && start_time >= '10:00' && start_time <= '12:00') {
      return [
        {
          id: 'conflict-001',
          hearing_id: 'hearing-001',
          conflicting_hearing_id: 'hearing-002',
          counsel_id: '1',
          conflict_type: 'counsel_overlap',
          severity: 'medium',
          message: 'Judge R.K. Sharma has another hearing scheduled at 10:30 AM'
        }
      ];
    }
    
    if (date === '2024-03-16' && start_time >= '14:00' && start_time <= '16:00') {
      return [
        {
          id: 'conflict-002',
          hearing_id: 'hearing-002',
          conflicting_hearing_id: 'hearing-003',
          counsel_id: '2',
          conflict_type: 'court_overlap',
          severity: 'medium',
          message: 'Court Room 3 is already booked for another hearing at 2:00 PM'
        }
      ];
    }
    
    return [];
  },

  /**
   * Format conflict messages for display
   */
  formatConflictMessage(conflict: HearingConflict): string {
    switch (conflict.conflict_type) {
      case 'counsel_overlap':
        return `⚠️ Counsel Conflict: ${conflict.message}`;
      case 'court_overlap':
        return `⚠️ Court Conflict: ${conflict.message}`;
      default:
        return `⚠️ ${conflict.message}`;
    }
  },

  /**
   * Get conflict severity color
   */
  getConflictSeverityColor(severity: 'info' | 'warning' | 'error'): string {
    switch (severity) {
      case 'info':
        return 'text-blue-600 bg-blue-50';
      case 'warning':
        return 'text-orange-600 bg-orange-50';
      case 'error':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  }
};
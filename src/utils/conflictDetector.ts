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
      
      // Check for judge conflicts
      if (judge_ids.length > 0) {
        const judgeConflicts = mockConflicts.filter(c => 
          c.type === 'judge' && 
          judge_ids.some(judgeId => c.conflicting_items.includes(judgeId))
        );
        conflicts.push(...judgeConflicts);
      }
      
      // Check for courtroom conflicts
      if (court_id && courtroom) {
        const courtroomConflicts = mockConflicts.filter(c => 
          c.type === 'courtroom' && 
          c.conflicting_items.includes(`${court_id}-${courtroom}`)
        );
        conflicts.push(...courtroomConflicts);
      }
      
      // Check for advocate conflicts
      if (internal_counsel_ids && internal_counsel_ids.length > 0) {
        const advocateConflicts = mockConflicts.filter(c => 
          c.type === 'advocate' && 
          internal_counsel_ids.some(counselId => c.conflicting_items.includes(counselId))
        );
        conflicts.push(...advocateConflicts);
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
          message: 'Judge R.K. Sharma has another hearing scheduled at 10:30 AM',
          conflicting_items: ['1'], // Judge ID
          severity: 'medium',
          hearing_id: 'hearing-001'
        }
      ];
    }
    
    if (date === '2024-03-16' && start_time >= '14:00' && start_time <= '16:00') {
      return [
        {
          type: 'courtroom',
          message: 'Court Room 3 is already booked for another hearing at 2:00 PM',
          conflicting_items: ['2-Court Room 3'], // Court-Courtroom combination
          severity: 'medium',
          hearing_id: 'hearing-002'
        }
      ];
    }
    
    return [];
  },

  /**
   * Format conflict messages for display
   */
  formatConflictMessage(conflict: HearingConflict): string {
    switch (conflict.type) {
      case 'judge':
        return `⚠️ Judge Conflict: ${conflict.message}`;
      case 'courtroom':
        return `⚠️ Courtroom Conflict: ${conflict.message}`;
      case 'advocate':
        return `⚠️ Advocate Conflict: ${conflict.message}`;
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
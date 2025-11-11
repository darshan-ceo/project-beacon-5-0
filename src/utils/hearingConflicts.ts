/**
 * Hearing Conflict Detection Utility
 * Detects scheduling conflicts between hearings
 */

import { Hearing } from '@/contexts/AppStateContext';

export interface HearingConflict {
  conflictingHearingId: string;
  conflictingHearingTitle: string;
  conflictingCaseNumber: string;
  conflictingTime: string;
  conflictingCourt: string;
  overlapMinutes: number;
  severity: 'critical' | 'warning'; // critical = same court, warning = different court
}

export interface ConflictCheckResult {
  hasConflicts: boolean;
  conflicts: HearingConflict[];
}

/**
 * Parse time string to minutes since midnight
 */
const parseTimeToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Calculate overlap in minutes between two time ranges
 */
const calculateOverlap = (
  start1: number,
  end1: number,
  start2: number,
  end2: number
): number => {
  const overlapStart = Math.max(start1, start2);
  const overlapEnd = Math.min(end1, end2);
  return Math.max(0, overlapEnd - overlapStart);
};

/**
 * Check if two hearings have overlapping times
 */
export const checkHearingOverlap = (
  hearing1: {
    date: string;
    start_time: string;
    end_time?: string;
    court_id: string;
  },
  hearing2: {
    date: string;
    start_time: string;
    end_time?: string;
    court_id: string;
  }
): { overlaps: boolean; overlapMinutes: number; severity: 'critical' | 'warning' } => {
  // Check if on same date
  if (hearing1.date !== hearing2.date) {
    return { overlaps: false, overlapMinutes: 0, severity: 'warning' };
  }

  // Parse times
  const h1Start = parseTimeToMinutes(hearing1.start_time);
  const h1End = parseTimeToMinutes(hearing1.end_time || `${parseInt(hearing1.start_time.split(':')[0]) + 1}:${hearing1.start_time.split(':')[1]}`);
  
  const h2Start = parseTimeToMinutes(hearing2.start_time);
  const h2End = parseTimeToMinutes(hearing2.end_time || `${parseInt(hearing2.start_time.split(':')[0]) + 1}:${hearing2.start_time.split(':')[1]}`);

  const overlapMinutes = calculateOverlap(h1Start, h1End, h2Start, h2End);
  const overlaps = overlapMinutes > 0;

  // Critical if same court, warning if different courts
  const severity = overlaps && hearing1.court_id === hearing2.court_id ? 'critical' : 'warning';

  return { overlaps, overlapMinutes, severity };
};

/**
 * Detect conflicts for a new/edited hearing against existing hearings
 */
export const detectHearingConflicts = (
  proposedHearing: {
    id?: string;
    date: string;
    start_time: string;
    end_time?: string;
    court_id: string;
  },
  existingHearings: Hearing[],
  cases: Array<{ id: string; caseNumber: string; title: string }>,
  courts: Array<{ id: string; name: string }>
): ConflictCheckResult => {
  const conflicts: HearingConflict[] = [];

  for (const hearing of existingHearings) {
    // Skip if checking against itself
    if (proposedHearing.id && hearing.id === proposedHearing.id) {
      continue;
    }

    // Skip if not scheduled
    if (hearing.status !== 'scheduled') {
      continue;
    }

    // Extract date and times
    const hearingDate = hearing.date || (hearing as any).hearing_date?.split('T')[0];
    const hearingStartTime = hearing.start_time || '10:00';
    const hearingEndTime = hearing.end_time || `${parseInt(hearingStartTime.split(':')[0]) + 1}:${hearingStartTime.split(':')[1]}`;

    if (!hearingDate) continue;

    const { overlaps, overlapMinutes, severity } = checkHearingOverlap(
      {
        date: proposedHearing.date,
        start_time: proposedHearing.start_time,
        end_time: proposedHearing.end_time,
        court_id: proposedHearing.court_id
      },
      {
        date: hearingDate,
        start_time: hearingStartTime,
        end_time: hearingEndTime,
        court_id: hearing.court_id
      }
    );

    if (overlaps) {
      const caseInfo = cases.find(c => c.id === hearing.case_id);
      const courtInfo = courts.find(c => c.id === hearing.court_id);

      conflicts.push({
        conflictingHearingId: hearing.id,
        conflictingHearingTitle: hearing.agenda || caseInfo?.title || 'Unknown Case',
        conflictingCaseNumber: caseInfo?.caseNumber || `CASE-${hearing.case_id}`,
        conflictingTime: `${hearingStartTime} - ${hearingEndTime}`,
        conflictingCourt: courtInfo?.name || 'Unknown Court',
        overlapMinutes,
        severity
      });
    }
  }

  return {
    hasConflicts: conflicts.length > 0,
    conflicts: conflicts.sort((a, b) => {
      // Sort critical conflicts first
      if (a.severity === 'critical' && b.severity === 'warning') return -1;
      if (a.severity === 'warning' && b.severity === 'critical') return 1;
      return b.overlapMinutes - a.overlapMinutes;
    })
  };
};

/**
 * Get all conflicts across all hearings
 */
export const getAllHearingConflicts = (
  hearings: Hearing[],
  cases: Array<{ id: string; caseNumber: string; title: string }>,
  courts: Array<{ id: string; name: string }>
): Map<string, ConflictCheckResult> => {
  const conflictsMap = new Map<string, ConflictCheckResult>();

  for (const hearing of hearings) {
    if (hearing.status !== 'scheduled') continue;

    const hearingDate = hearing.date || (hearing as any).hearing_date?.split('T')[0];
    if (!hearingDate) continue;

    const result = detectHearingConflicts(
      {
        id: hearing.id,
        date: hearingDate,
        start_time: hearing.start_time || '10:00',
        end_time: hearing.end_time,
        court_id: hearing.court_id
      },
      hearings,
      cases,
      courts
    );

    if (result.hasConflicts) {
      conflictsMap.set(hearing.id, result);
    }
  }

  return conflictsMap;
};

import { useMemo } from 'react';
import { useAppState } from '@/contexts/AppStateContext';
import { Hearing } from '@/types/hearings';
import { addDays, isWithinInterval, startOfDay } from 'date-fns';

type FilterType = 'all' | 'my-cases' | 'team' | 'this-week' | 'next-30-days';

interface UseUpcomingHearingsOptions {
  filter: FilterType;
  limit: number;
  currentUserId?: string;
  teamMemberIds?: string[];
}

export function useUpcomingHearings({
  filter,
  limit,
  currentUserId,
  teamMemberIds = [],
}: UseUpcomingHearingsOptions) {
  const { state } = useAppState();

  const filteredHearings = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    
    // Filter future hearings only
    let hearings = state.hearings.filter(h => {
      const hearingDate = new Date(h.date);
      return hearingDate >= today;
    });

    // Apply filter logic
    switch (filter) {
      case 'my-cases':
        if (currentUserId) {
          const myCaseIds = state.cases
            .filter(c => c.assignedToId === currentUserId)
            .map(c => c.id);
          hearings = hearings.filter(h => myCaseIds.includes(h.case_id));
        }
        break;
      
      case 'team':
        if (teamMemberIds.length > 0) {
          const teamCaseIds = state.cases
            .filter(c => teamMemberIds.includes(c.assignedToId))
            .map(c => c.id);
          hearings = hearings.filter(h => teamCaseIds.includes(h.case_id));
        }
        break;
      
      case 'this-week':
        const weekEnd = addDays(today, 7);
        hearings = hearings.filter(h => {
          const hearingDate = new Date(h.date);
          return isWithinInterval(hearingDate, { start: today, end: weekEnd });
        });
        break;
      
      case 'next-30-days':
        const monthEnd = addDays(today, 30);
        hearings = hearings.filter(h => {
          const hearingDate = new Date(h.date);
          return isWithinInterval(hearingDate, { start: today, end: monthEnd });
        });
        break;
      
      case 'all':
      default:
        // No additional filtering
        break;
    }

    // Sort by date ascending
    hearings.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Limit results
    return hearings.slice(0, limit);
  }, [state.hearings, state.cases, filter, limit, currentUserId, teamMemberIds]);

  return filteredHearings;
}

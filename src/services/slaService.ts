import { Case } from '@/contexts/AppStateContext';
import { differenceInDays } from 'date-fns';

export interface SLAConfig {
  greenThreshold: number; // days
  amberThreshold: number; // days
  redThreshold: number; // days
}

const DEFAULT_SLA_CONFIG: SLAConfig = {
  greenThreshold: 15,
  amberThreshold: 30,
  redThreshold: 45
};

/**
 * Calculate SLA status for a single case
 * Green: ≤15 days since last update OR upcoming hearing within 30 days
 * Amber: 16-30 days since last update
 * Red: >30 days since last update (Timeline Breach)
 */
export function calculateSLAStatus(
  caseItem: Case,
  config: SLAConfig = DEFAULT_SLA_CONFIG
): 'Green' | 'Amber' | 'Red' {
  const now = new Date();
  const lastUpdate = new Date(caseItem.lastUpdated);
  const daysSinceUpdate = differenceInDays(now, lastUpdate);
  
  // Check if case has upcoming hearing (within 30 days)
  if (caseItem.nextHearing) {
    const hearingDate = new Date(caseItem.nextHearing.date);
    const daysToHearing = differenceInDays(hearingDate, now);
    
    // If hearing is upcoming (0-30 days away), SLA is green
    if (daysToHearing >= 0 && daysToHearing <= 30) {
      return 'Green';
    }
  }
  
  // Calculate based on days since last update
  if (daysSinceUpdate <= config.greenThreshold) {
    return 'Green';
  } else if (daysSinceUpdate <= config.amberThreshold) {
    return 'Amber';
  } else {
    return 'Red'; // Timeline Breach
  }
}

/**
 * Recalculate SLA status for all active cases
 * Returns a map of caseId → SLA status
 */
export function recalculateAllSLAs(cases: Case[]): Map<string, 'Green' | 'Amber' | 'Red'> {
  const slaMap = new Map<string, 'Green' | 'Amber' | 'Red'>();
  
  cases.forEach(caseItem => {
    // Only calculate SLA for active cases
    if (caseItem.status === 'Active') {
      const slaStatus = calculateSLAStatus(caseItem);
      slaMap.set(caseItem.id, slaStatus);
    }
  });
  
  return slaMap;
}

/**
 * Get cases that breach timeline (Red SLA)
 */
export function getTimelineBreaches(cases: Case[]): Case[] {
  return cases.filter(caseItem => {
    if (caseItem.status !== 'Active') return false;
    return calculateSLAStatus(caseItem) === 'Red';
  });
}

/**
 * Get SLA summary statistics
 */
export function getSLASummary(cases: Case[]): {
  total: number;
  green: number;
  amber: number;
  red: number;
} {
  const activeCases = cases.filter(c => c.status === 'Active');
  const summary = {
    total: activeCases.length,
    green: 0,
    amber: 0,
    red: 0
  };
  
  activeCases.forEach(caseItem => {
    const status = calculateSLAStatus(caseItem);
    if (status === 'Green') summary.green++;
    else if (status === 'Amber') summary.amber++;
    else summary.red++;
  });
  
  return summary;
}

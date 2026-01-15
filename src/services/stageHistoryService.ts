/**
 * Stage History Service
 * Fetches stage context for Remand/Reopen target stage selection
 */

import { supabase } from '@/integrations/supabase/client';
import { StageHistoryContext, STAGE_AUTHORITIES } from '@/types/remand';
import { CASE_STAGES, normalizeStage } from '@/utils/stageUtils';

/**
 * Get stage history context for all stages up to and including current stage
 * Used for Remand/Reopen target stage selection cards
 */
export async function getStageHistoryContext(
  caseId: string,
  currentStage: string
): Promise<StageHistoryContext[]> {
  const canonicalCurrent = normalizeStage(currentStage);
  const currentIndex = CASE_STAGES.findIndex(s => s === canonicalCurrent);
  
  if (currentIndex === -1) {
    console.warn(`Unknown current stage: ${currentStage}`);
    return [];
  }

  // Get all stages up to and including current
  const eligibleStages = CASE_STAGES.slice(0, currentIndex + 1);

  try {
    // Fetch transition history to determine which stages have been visited
    const { data: transitions, error: transError } = await supabase
      .from('stage_transitions')
      .select('to_stage, from_stage, created_at')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false });

    if (transError) throw transError;

    // Fetch task counts per stage
    const { data: tasks, error: taskError } = await supabase
      .from('tasks')
      .select('stage, status')
      .eq('case_id', caseId);

    if (taskError) throw taskError;

    // Build stage context for each eligible stage
    const stageContexts: StageHistoryContext[] = eligibleStages.map(stageName => {
      // Find transitions to this stage
      const stageTransitions = (transitions || []).filter(
        t => normalizeStage(t.to_stage) === stageName
      );
      
      const hasBeenVisited = stageTransitions.length > 0 || stageName === canonicalCurrent;
      const lastActiveDate = stageTransitions.length > 0 
        ? stageTransitions[0].created_at 
        : null;

      // Count tasks for this stage
      const stageTasks = (tasks || []).filter(t => normalizeStage(t.stage || '') === stageName);
      const completedTasksCount = stageTasks.filter(t => t.status === 'Completed').length;
      const pendingTasksCount = stageTasks.filter(t => t.status !== 'Completed').length;

      return {
        stageName,
        stageKey: stageName,
        authority: STAGE_AUTHORITIES[stageName] || 'Unknown Authority',
        lastActiveDate,
        cycleCount: stageTransitions.length,
        completedTasksCount,
        pendingTasksCount,
        hasBeenVisited
      };
    });

    return stageContexts;
  } catch (error) {
    console.error('Failed to fetch stage history context:', error);
    
    // Return basic context without history data
    return eligibleStages.map(stageName => ({
      stageName,
      stageKey: stageName,
      authority: STAGE_AUTHORITIES[stageName] || 'Unknown Authority',
      lastActiveDate: null,
      cycleCount: 0,
      completedTasksCount: 0,
      pendingTasksCount: 0,
      hasBeenVisited: stageName === canonicalCurrent
    }));
  }
}

/**
 * Get count of superseded transitions that would be preserved
 */
export async function getSupersededTransitionsCount(
  caseId: string,
  targetStage: string
): Promise<number> {
  const canonicalTarget = normalizeStage(targetStage);
  const targetIndex = CASE_STAGES.findIndex(s => s === canonicalTarget);
  
  if (targetIndex === -1) return 0;

  try {
    const { data, error } = await supabase
      .from('stage_transitions')
      .select('id, to_stage')
      .eq('case_id', caseId);

    if (error) throw error;

    // Count transitions to stages after the target stage
    const supersededCount = (data || []).filter(t => {
      const stageIndex = CASE_STAGES.findIndex(s => s === normalizeStage(t.to_stage));
      return stageIndex > targetIndex;
    }).length;

    return supersededCount;
  } catch (error) {
    console.error('Failed to count superseded transitions:', error);
    return 0;
  }
}

export const stageHistoryService = {
  getStageHistoryContext,
  getSupersededTransitionsCount
};

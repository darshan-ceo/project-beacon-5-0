/**
 * Stage Instance Service
 * Fetches stage instances with duration and cycle tracking from Supabase
 */

import { supabase } from '@/integrations/supabase/client';
import { STAGE_AUTHORITIES } from '@/types/remand';

export interface StageInstanceWithDetails {
  id: string;
  caseId: string;
  stageKey: string;
  cycleNo: number;
  startedAt: string;
  endedAt: string | null;
  status: 'Active' | 'Completed' | 'Remanded' | 'Superseded';
  createdBy: string;
  createdByName?: string;
  authority: string;
  durationDays: number;
  taskCount: {
    completed: number;
    pending: number;
    total: number;
  };
  hearingCount: number;
  documentCount: number;
}

/**
 * Get all stage instances for a case with enriched details
 */
export async function getStageInstances(caseId: string): Promise<StageInstanceWithDetails[]> {
  if (!caseId) return [];

  try {
    // Fetch stage instances
    const { data: instances, error } = await supabase
      .from('stage_instances')
      .select(`
        *,
        profiles:created_by (full_name)
      `)
      .eq('case_id', caseId)
      .order('started_at', { ascending: false });

    if (error) throw error;

    if (!instances || instances.length === 0) {
      return [];
    }

    // Fetch task counts per stage
    const { data: tasks } = await supabase
      .from('tasks')
      .select('stage, status')
      .eq('case_id', caseId);

    // Fetch hearing count
    const { data: hearings } = await supabase
      .from('hearings')
      .select('id')
      .eq('case_id', caseId);

    // Fetch document count
    const { data: documents } = await supabase
      .from('documents')
      .select('id')
      .eq('case_id', caseId);

    // Map to StageInstanceWithDetails
    return (instances as any[]).map(instance => {
      // Calculate duration
      const startDate = new Date(instance.started_at);
      const endDate = instance.ended_at ? new Date(instance.ended_at) : new Date();
      const durationMs = endDate.getTime() - startDate.getTime();
      const durationDays = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60 * 24)));

      // Count tasks for this stage
      const stageTasks = (tasks || []).filter(t => t.stage === instance.stage_key);
      const completedTasks = stageTasks.filter(t => t.status === 'Completed').length;
      const pendingTasks = stageTasks.filter(t => t.status !== 'Completed').length;

      return {
        id: instance.id,
        caseId: instance.case_id,
        stageKey: instance.stage_key,
        cycleNo: instance.cycle_no,
        startedAt: instance.started_at,
        endedAt: instance.ended_at,
        status: instance.status,
        createdBy: instance.created_by,
        createdByName: instance.profiles?.full_name || 'System',
        authority: STAGE_AUTHORITIES[instance.stage_key] || 'Unknown Authority',
        durationDays,
        taskCount: {
          completed: completedTasks,
          pending: pendingTasks,
          total: stageTasks.length
        },
        hearingCount: (hearings || []).length,
        documentCount: (documents || []).length
      };
    });
  } catch (error) {
    console.error('Failed to fetch stage instances:', error);
    return [];
  }
}

/**
 * Get the current active stage instance for a case
 */
export async function getActiveStageInstance(caseId: string): Promise<StageInstanceWithDetails | null> {
  const instances = await getStageInstances(caseId);
  return instances.find(i => i.status === 'Active') || null;
}

export const stageInstanceService = {
  getStageInstances,
  getActiveStageInstance
};

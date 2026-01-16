import { useState, useEffect, useCallback } from 'react';
import { TaskContextData } from '@/types/taskContext';
import { taskContextService } from '@/services/taskContextService';
import { supabase } from '@/integrations/supabase/client';

export function useTaskContext(taskId: string | undefined) {
  const [context, setContext] = useState<TaskContextData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchContext = useCallback(async () => {
    if (!taskId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await taskContextService.getTaskContext(taskId);
      setContext(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch task context'));
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchContext();

    // Subscribe to real-time updates for task and messages
    if (!taskId) return;

    const taskChannel = supabase
      .channel(`task-context-${taskId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `id=eq.${taskId}`,
        },
        () => {
          // Refetch context on task changes
          fetchContext();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_messages',
          filter: `task_id=eq.${taskId}`,
        },
        () => {
          // Refetch context on message changes
          fetchContext();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(taskChannel);
    };
  }, [taskId, fetchContext]);

  const updateClientVisibility = useCallback(async (
    messageId: string,
    isVisible: boolean,
    userId: string
  ) => {
    const success = await taskContextService.updateClientVisibility(messageId, isVisible, userId);
    if (success) {
      // Refetch to get updated data
      fetchContext();
    }
    return success;
  }, [fetchContext]);

  const refetch = useCallback(() => {
    fetchContext();
  }, [fetchContext]);

  return {
    context,
    isLoading,
    error,
    refetch,
    updateClientVisibility
  };
}

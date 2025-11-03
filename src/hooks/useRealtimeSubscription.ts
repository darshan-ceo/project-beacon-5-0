import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type RealtimeTable = 'cases' | 'tasks' | 'hearings' | 'documents' | 'clients';

interface UseRealtimeSubscriptionOptions {
  table: RealtimeTable;
  queryKey: string[];
  tenantId: string | null;
  enabled?: boolean;
  showToast?: boolean;
}

/**
 * Hook to subscribe to real-time updates for a Supabase table
 * Automatically invalidates React Query cache when changes occur
 */
export function useRealtimeSubscription({
  table,
  queryKey,
  tenantId,
  enabled = true,
  showToast = true,
}: UseRealtimeSubscriptionOptions) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (!enabled || !tenantId) return;

    const channel = supabase
      .channel(`${table}-realtime-${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          console.log(`[Realtime] ${table} change:`, payload.eventType);

          // Invalidate queries to refetch data
          queryClient.invalidateQueries({ queryKey });

          // Show toast notification
          if (showToast) {
            const eventLabels = {
              INSERT: 'added',
              UPDATE: 'updated',
              DELETE: 'deleted',
            };

            const label = eventLabels[payload.eventType as keyof typeof eventLabels] || 'changed';

            toast({
              title: `${table.charAt(0).toUpperCase() + table.slice(1)} ${label}`,
              description: `A ${table.slice(0, -1)} was ${label} by another user.`,
            });
          }
        }
      )
      .subscribe();

    console.log(`[Realtime] Subscribed to ${table} changes for tenant ${tenantId}`);

    return () => {
      console.log(`[Realtime] Unsubscribing from ${table}`);
      supabase.removeChannel(channel);
    };
  }, [table, tenantId, enabled, queryKey, queryClient, showToast, toast]);
}

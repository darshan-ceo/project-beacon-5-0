/**
 * Task Bundle Trigger Service - DEPRECATED
 * App uses Supabase exclusively - task bundle automation not implemented
 */

export const taskBundleTriggerService = {
  processStageTransition: async () => {
    console.warn('[taskBundleTriggerService] DEPRECATED');
    return { createdTasks: [], errors: [] };
  },
  processNoticeReceived: async () => {
    console.warn('[taskBundleTriggerService] DEPRECATED');
    return { createdTasks: [], errors: [] };
  },
  triggerTaskBundles: async () => {
    console.warn('[taskBundleTriggerService] DEPRECATED');
    return { createdTasks: [], errors: [] };
  }
};

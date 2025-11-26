/**
 * Task Bundle Trigger Service - DEPRECATED
 * App uses Supabase exclusively - task bundle automation not implemented
 */

export const taskBundleTriggerService = {
  processStageTransition: async (..._args: any[]) => {
    console.warn('[taskBundleTriggerService] DEPRECATED');
    return { createdTasks: [], errors: [], totalTasksCreated: 0 };
  },
  processNoticeReceived: async (..._args: any[]) => {
    console.warn('[taskBundleTriggerService] DEPRECATED');
    return { createdTasks: [], errors: [], totalTasksCreated: 0 };
  },
  triggerTaskBundles: async (..._args: any[]) => {
    console.warn('[taskBundleTriggerService] DEPRECATED');
    return { createdTasks: [], errors: [], totalTasksCreated: 0 };
  }
};

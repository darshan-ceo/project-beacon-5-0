/**
 * Stage Transition QA - DEPRECATED
 * App uses Supabase exclusively - no QA tests needed
 */

export const stageTransitionQA = {
  runAllTests: async () => {
    console.warn('[stageTransitionQA] DEPRECATED');
    return { passed: 0, failed: 0, results: [] };
  }
};

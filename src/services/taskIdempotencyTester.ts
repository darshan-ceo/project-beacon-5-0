/**
 * Task Idempotency Tester - DEPRECATED
 * App uses Supabase exclusively - no idempotency tests needed
 */

export const taskIdempotencyTester = {
  runAllTests: async () => {
    console.warn('[taskIdempotencyTester] DEPRECATED');
    return { passed: 0, failed: 0, results: [] };
  }
};

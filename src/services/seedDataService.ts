/**
 * Seed Data Service - DEPRECATED
 * App uses Supabase exclusively - no seed data needed
 */

export const seedDataService = {
  seedAll: async () => {
    console.warn('[seedDataService] DEPRECATED - use Supabase data');
  },
  clearAll: async () => {
    console.warn('[seedDataService] DEPRECATED - use Supabase data');
  },
  generateComprehensiveSeedData: async () => {
    console.warn('[seedDataService] DEPRECATED - use Supabase data');
    return { cases: [], clients: [], tasks: [] };
  },
  getSeedData: () => {
    console.warn('[seedDataService] DEPRECATED - use Supabase data');
    return { cases: [], clients: [], tasks: [] };
  }
};

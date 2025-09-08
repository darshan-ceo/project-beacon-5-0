import Fuse from 'fuse.js';
import { helpService, HelpContent, GlossaryTerm } from '@/services/helpService';

interface SearchResult {
  item: HelpContent | GlossaryTerm;
  type: 'article' | 'glossary';
  score: number;
  matches?: any[];
}

interface SearchOptions {
  includeScore?: boolean;
  threshold?: number;
  limit?: number;
  categories?: string[];
  roles?: string[];
}

class EnhancedHelpService {
  private searchIndex: Fuse<HelpContent | GlossaryTerm> | null = null;
  private searchCache = new Map<string, SearchResult[]>();
  private indexLastBuilt: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Build search index with Fuse.js for fuzzy search
   */
  async buildSearchIndex(userRole: string): Promise<void> {
    const now = Date.now();
    
    // Skip rebuild if index is recent
    if (this.searchIndex && (now - this.indexLastBuilt) < this.CACHE_DURATION) {
      return;
    }

    try {
      // Get all content
      const [helpContent, glossaryTerms] = await Promise.all([
        helpService.getHelpContent(userRole),
        helpService.getGlossaryTerms()
      ]);

      // Prepare search data with type indicators
      const searchData: Array<(HelpContent | GlossaryTerm) & { _type: 'article' | 'glossary' }> = [
        ...helpContent.map(item => ({ ...item, _type: 'article' as const })),
        ...glossaryTerms.map(item => ({ ...item, _type: 'glossary' as const, roles: ['Users', 'Admin', 'Developers'] }))
      ];

      // Configure Fuse.js options
      const fuseOptions = {
        keys: [
          { name: 'title', weight: 0.7 },
          { name: 'description', weight: 0.5 },
          { name: 'content', weight: 0.3 },
          { name: 'tags', weight: 0.4 },
          { name: 'term', weight: 0.8 }, // For glossary
          { name: 'definition', weight: 0.4 }, // For glossary
          { name: 'category', weight: 0.2 }
        ],
        includeScore: true,
        includeMatches: true,
        threshold: 0.4, // More lenient fuzzy matching
        ignoreLocation: true,
        findAllMatches: true,
        minMatchCharLength: 2,
        shouldSort: true,
        fieldNormWeight: 1.5
      };

      this.searchIndex = new Fuse(searchData, fuseOptions);
      this.indexLastBuilt = now;
      
      // Clear cache when index is rebuilt
      this.searchCache.clear();

      console.log(`Search index built with ${searchData.length} items for role: ${userRole}`);
    } catch (error) {
      console.error('Failed to build search index:', error);
      throw error;
    }
  }

  /**
   * Enhanced search with fuzzy matching and filtering
   */
  async search(
    query: string, 
    userRole: string, 
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    if (!query.trim()) {
      return [];
    }

    const cacheKey = `${query}:${userRole}:${JSON.stringify(options)}`;
    
    // Check cache first
    if (this.searchCache.has(cacheKey)) {
      return this.searchCache.get(cacheKey)!;
    }

    // Build index if needed
    await this.buildSearchIndex(userRole);

    if (!this.searchIndex) {
      console.warn('Search index not available, falling back to basic search');
      return this.fallbackSearch(query, userRole);
    }

    try {
      const {
        threshold = 0.4,
        limit = 20,
        categories,
        roles
      } = options;

      // Perform fuzzy search
      let searchResults = this.searchIndex.search(query, {
        limit: limit * 2 // Get more results for filtering
      });

      // Convert to our SearchResult format and filter
      let results: SearchResult[] = searchResults
        .map(result => {
          const item = result.item as any;
          const type = item._type || (item.term ? 'glossary' : 'article');
          
          return {
            item: item,
            type: type as 'article' | 'glossary',
            score: result.score || 0,
            matches: result.matches ? [...result.matches] : undefined
          };
        })
        .filter(result => {
          // Role-based filtering
          if (roles && roles.length > 0) {
            if (!result.item.roles?.some(role => roles.includes(role))) {
              return false;
            }
          } else {
            // Default role filtering
            if (!result.item.roles?.includes(userRole)) {
              return false;
            }
          }

          // Category filtering
          if (categories && categories.length > 0) {
            if (!categories.includes(result.item.category)) {
              return false;
            }
          }

          // Score threshold
          return result.score <= threshold;
        })
        .slice(0, limit);

      // Sort by relevance (lower score = more relevant in Fuse.js)
      results.sort((a, b) => a.score - b.score);

      // Cache results
      this.searchCache.set(cacheKey, results);

      return results;
    } catch (error) {
      console.error('Enhanced search failed:', error);
      return this.fallbackSearch(query, userRole);
    }
  }

  /**
   * Fallback to basic search if enhanced search fails
   */
  private async fallbackSearch(query: string, userRole: string): Promise<SearchResult[]> {
    try {
      const basicResults = await helpService.searchContent(query, userRole);
      return basicResults.map(item => ({
        item,
        type: 'article' as const,
        score: 0.5
      }));
    } catch (error) {
      console.error('Fallback search failed:', error);
      return [];
    }
  }

  /**
   * Get search suggestions based on partial query
   */
  async getSearchSuggestions(
    partialQuery: string, 
    userRole: string,
    limit: number = 5
  ): Promise<string[]> {
    if (partialQuery.length < 2) {
      return [];
    }

    await this.buildSearchIndex(userRole);

    if (!this.searchIndex) {
      return [];
    }

    try {
      const results = this.searchIndex.search(partialQuery, { limit: limit * 2 });
      const suggestions = new Set<string>();

      results.forEach(result => {
        const item = result.item as any;
        
        // Add title as suggestion
        if (item.title) {
          suggestions.add(item.title);
        }
        
        // Add term as suggestion (for glossary)
        if (item.term) {
          suggestions.add(item.term);
        }
        
        // Add matching tags
        if (item.tags && Array.isArray(item.tags)) {
          item.tags.forEach((tag: string) => {
            if (tag.toLowerCase().includes(partialQuery.toLowerCase())) {
              suggestions.add(tag);
            }
          });
        }
      });

      return Array.from(suggestions).slice(0, limit);
    } catch (error) {
      console.error('Failed to get search suggestions:', error);
      return [];
    }
  }

  /**
   * Get popular search terms
   */
  getPopularSearchTerms(userRole: string): string[] {
    const popularTerms = {
      'Users': ['case management', 'hearing schedule', 'document upload', 'client details', 'stage transition'],
      'Admin': ['user management', 'system settings', 'reports', 'audit trail', 'backup'],
      'Developers': ['API documentation', 'database schema', 'deployment', 'troubleshooting', 'configuration'],
      'Client': ['case status', 'hearing dates', 'document access', 'payment', 'updates']
    };

    return popularTerms[userRole as keyof typeof popularTerms] || popularTerms.Users;
  }

  /**
   * Clear search cache
   */
  clearCache(): void {
    this.searchCache.clear();
    this.searchIndex = null;
    this.indexLastBuilt = 0;
  }

  /**
   * Get search analytics (mock implementation)
   */
  getSearchAnalytics(): { term: string; count: number; lastSearched: Date }[] {
    // In a real implementation, this would track actual search usage
    return [
      { term: 'case management', count: 45, lastSearched: new Date() },
      { term: 'document upload', count: 32, lastSearched: new Date() },
      { term: 'hearing schedule', count: 28, lastSearched: new Date() },
      { term: 'client details', count: 21, lastSearched: new Date() },
      { term: 'reports', count: 18, lastSearched: new Date() }
    ];
  }
}

export const enhancedHelpService = new EnhancedHelpService();
export type { SearchResult, SearchOptions };
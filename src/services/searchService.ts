/**
 * Global Search Service for Beacon Essential
 * Handles API integration and demo fallback for global search functionality
 */

import { apiService } from './apiService';
import { envConfig } from '@/utils/envConfig';
import { featureFlagService } from './featureFlagService';
import { idbStorage } from '@/utils/idb';

export interface SearchResult {
  type: 'case' | 'client' | 'task' | 'document' | 'hearing';
  id: string;
  title: string;
  subtitle: string;
  url: string;
  score: number;
  highlights: string[];
  badges: string[];
}

export interface SearchResponse {
  results: SearchResult[];
  next_cursor?: string;
}

export interface SearchSuggestion {
  text: string;
  type?: string;
  count?: number;
}

export type SearchScope = 'all' | 'cases' | 'clients' | 'tasks' | 'documents' | 'hearings';

class SearchService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private recentSearches: string[] = [];
  private requestController: AbortController | null = null;
  private lastRequestTime = 0;
  private readonly debounceMs = 300;
  private readonly cacheMaxAge = 5 * 60 * 1000; // 5 minutes
  private readonly maxRecentSearches = 10;

  constructor() {
    this.loadRecentSearches();
  }

  /**
   * Perform global search with debouncing and caching
   */
  async search(
    query: string, 
    scope: SearchScope = 'all', 
    limit = 20,
    cursor?: string
  ): Promise<SearchResponse> {
    if (!query.trim()) {
      return { results: [] };
    }

    // Cancel previous request
    if (this.requestController) {
      this.requestController.abort();
    }

    // Debounce requests
    const now = Date.now();
    if (now - this.lastRequestTime < this.debounceMs) {
      await new Promise(resolve => setTimeout(resolve, this.debounceMs));
    }
    this.lastRequestTime = now;

    // Check cache first
    const cacheKey = `search:${query}:${scope}:${limit}:${cursor || ''}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      return cached;
    }

    // Create new abort controller
    this.requestController = new AbortController();

    try {
      let response: SearchResponse;

      if (this.shouldUseDemoMode()) {
        response = await this.searchDemo(query, scope, limit);
      } else {
        response = await this.searchAPI(query, scope, limit, cursor);
      }

      // Cache the result
      this.setCachedResult(cacheKey, response);

      // Add to recent searches
      this.addRecentSearch(query);

      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }

      console.error('Search error:', error);
      
      // Fallback to demo mode if API fails and dev mode is on
      if (this.isDevModeOn()) {
        console.log('API failed, falling back to demo mode');
        return this.searchDemo(query, scope, limit);
      }

      throw error;
    }
  }

  /**
   * Get search suggestions with type-ahead
   */
  async suggest(query: string, limit = 8): Promise<SearchSuggestion[]> {
    if (!query.trim() || query.length < 2) {
      return this.getRecentSearchSuggestions(limit);
    }

    const cacheKey = `suggest:${query}:${limit}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      let suggestions: SearchSuggestion[];

      if (this.shouldUseDemoMode()) {
        suggestions = await this.suggestDemo(query, limit);
      } else {
        suggestions = await this.suggestAPI(query, limit);
      }

      this.setCachedResult(cacheKey, suggestions);
      return suggestions;
    } catch (error) {
      console.error('Suggestions error:', error);
      
      // Fallback to demo mode or recent searches
      if (this.isDevModeOn()) {
        console.log('Suggestions API failed, falling back to demo mode');
        return this.suggestDemo(query, limit);
      }
      
      return this.getRecentSearchSuggestions(limit);
    }
  }

  /**
   * API search implementation
   */
  private async searchAPI(
    query: string, 
    scope: SearchScope, 
    limit: number,
    cursor?: string
  ): Promise<SearchResponse> {
    const scopeParam = scope === 'all' ? 'all' : scope;
    const params = new URLSearchParams({
      q: query,
      scope: scopeParam,
      limit: limit.toString(),
    });

    if (cursor) {
      params.append('cursor', cursor);
    }

    const response = await apiService.get<SearchResponse>(
      `/api/search?${params.toString()}`
    );

    if (!response.success) {
      throw new Error(response.error || 'Search failed');
    }

    return response.data;
  }

  /**
   * API suggestions implementation
   */
  private async suggestAPI(query: string, limit: number): Promise<SearchSuggestion[]> {
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
    });

    const response = await apiService.get<SearchSuggestion[]>(
      `/api/search/suggest?${params.toString()}`
    );

    if (!response.success) {
      throw new Error(response.error || 'Suggestions failed');
    }

    return response.data;
  }

  /**
   * Demo mode search implementation
   */
  private async searchDemo(
    query: string, 
    scope: SearchScope, 
    limit: number
  ): Promise<SearchResponse> {
    // Import demo data dynamically to avoid loading it unnecessarily
    const { demoSearchIndex } = await import('@/data/demoSearchData');
    
    const searchTerms = query.toLowerCase().split(' ');
    let results = demoSearchIndex.filter(item => {
      if (scope !== 'all') {
        // Convert plural scope to singular for comparison
        const singularScope = scope.endsWith('s') ? scope.slice(0, -1) : scope;
        if (item.type !== singularScope) return false;
      }
      
      const searchableText = `${item.title} ${item.subtitle} ${item.highlights.join(' ')}`.toLowerCase();
      return searchTerms.some(term => searchableText.includes(term));
    });

    // Sort by relevance (simple scoring)
    results = results.map(item => ({
      ...item,
      score: this.calculateDemoScore(item, searchTerms)
    })).sort((a, b) => b.score - a.score);

    return {
      results: results.slice(0, limit)
    };
  }

  /**
   * Demo mode suggestions implementation
   */
  private async suggestDemo(query: string, limit: number): Promise<SearchSuggestion[]> {
    const { demoSearchIndex } = await import('@/data/demoSearchData');
    
    const queryLower = query.toLowerCase();
    const suggestions = new Map<string, SearchSuggestion>();

    demoSearchIndex.forEach(item => {
      const title = item.title.toLowerCase();
      if (title.includes(queryLower)) {
        const key = title;
        if (!suggestions.has(key)) {
          suggestions.set(key, {
            text: item.title,
            type: item.type,
            count: 1
          });
        }
      }
    });

    return Array.from(suggestions.values()).slice(0, limit);
  }

  /**
   * Calculate demo search score
   */
  private calculateDemoScore(item: SearchResult, searchTerms: string[]): number {
    let score = 0;
    const titleLower = item.title.toLowerCase();
    const subtitleLower = item.subtitle.toLowerCase();

    searchTerms.forEach(term => {
      if (titleLower.includes(term)) score += 2;
      if (subtitleLower.includes(term)) score += 1;
      if (item.highlights.some(h => h.toLowerCase().includes(term))) score += 0.5;
    });

    return score;
  }

  /**
   * Check if dev mode is active (matches header Dev Mode badge logic)
   */
  private isDevModeOn(): boolean {
    return envConfig.QA_ON || envConfig.MOCK_ON || !envConfig.API_SET;
  }

  /**
   * Determine if demo mode should be used
   */
  private shouldUseDemoMode(): boolean {
    const isFeatureEnabled = featureFlagService.isEnabled('global_search_v1');
    const isDemoMode = envConfig.QA_ON && !envConfig.API_SET;
    return !isFeatureEnabled || isDemoMode;
  }

  /**
   * Cache management
   */
  private getCachedResult(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheMaxAge) {
      return cached.data;
    }
    return null;
  }

  private setCachedResult(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Recent searches management
   */
  private async loadRecentSearches(): Promise<void> {
    try {
      const stored = await idbStorage.get('recent_searches');
      if (Array.isArray(stored)) {
        this.recentSearches = stored;
      }
    } catch (error) {
      console.warn('Failed to load recent searches:', error);
    }
  }

  private async addRecentSearch(query: string): Promise<void> {
    const trimmed = query.trim();
    if (!trimmed || this.recentSearches.includes(trimmed)) return;

    this.recentSearches.unshift(trimmed);
    this.recentSearches = this.recentSearches.slice(0, this.maxRecentSearches);

    try {
      await idbStorage.set('recent_searches', this.recentSearches);
    } catch (error) {
      console.warn('Failed to save recent searches:', error);
    }
  }

  private getRecentSearchSuggestions(limit: number): SearchSuggestion[] {
    return this.recentSearches.slice(0, limit).map(text => ({
      text,
      type: 'recent'
    }));
  }

  /**
   * Get recent searches for display
   */
  getRecentSearches(): string[] {
    return [...this.recentSearches];
  }

  /**
   * Clear all caches and recent searches
   */
  async clearCache(): Promise<void> {
    this.cache.clear();
    this.recentSearches = [];
    
    try {
      await idbStorage.delete('recent_searches');
    } catch (error) {
      console.warn('Failed to clear recent searches:', error);
    }
  }
}

export const searchService = new SearchService();
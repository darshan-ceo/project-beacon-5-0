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

    // Check cache first (include state version to avoid stale results in demo mode)
    const stateVersion = this.shouldUseDemoMode()
      ? String((localStorage.getItem('lawfirm_app_data') || localStorage.getItem('beacon-app-state') || '').length)
      : '';
    const cacheKey = `search:${query}:${scope}:${limit}:${cursor || ''}:${stateVersion}`;
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

    const stateVersion = this.shouldUseDemoMode()
      ? String((localStorage.getItem('lawfirm_app_data') || localStorage.getItem('beacon-app-state') || '').length)
      : '';
    const cacheKey = `suggest:${query}:${limit}:${stateVersion}`;
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
    
    // Get all dynamic results from AppState (cases, hearings, tasks, clients, documents)
    const dynamicResults = await this.getDynamicResults(query, scope);
    
    // Combine static demo data with dynamic AppState data
    const allResults = [...demoSearchIndex, ...dynamicResults];
    
    const normalizedQuery = this.normalize(query);
    const searchTerms = normalizedQuery.split(' ').filter(Boolean);
    let results = allResults.filter(item => {
      if (scope !== 'all') {
        // Convert plural scope to singular for comparison
        const singularScope = (scope.endsWith('s') ? scope.slice(0, -1) : scope) as SearchResult['type'];
        if (item.type !== singularScope) return false;
      }
      
      const searchableRaw = `${item.title} ${item.subtitle} ${item.highlights.join(' ')} ${item.badges.join(' ')}`;
      const searchableText = this.normalize(searchableRaw);
      
      // For better matching, require at least one search term to match
      // But also check for partial phrase matching
      const hasTermMatch = searchTerms.some(term => searchableText.includes(term));
      const hasPhraseMatch = searchableText.includes(normalizedQuery);
      
      return hasTermMatch || hasPhraseMatch;
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
    
    // Get all dynamic results for suggestions too
    const dynamicResults = await this.getDynamicResults(query, 'all');
    const allResults = [...demoSearchIndex, ...dynamicResults];
    
    const normalizedQuery = this.normalize(query);
    const suggestions = new Map<string, SearchSuggestion>();

    allResults.forEach(item => {
      const titleNorm = this.normalize(item.title);
      if (titleNorm.includes(normalizedQuery)) {
        const key = item.title;
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
   * Get all dynamic results from AppState (cases, hearings, tasks, clients, documents)
   */
  private async getDynamicResults(query: string, scope: SearchScope): Promise<SearchResult[]> {
    try {
      const results: SearchResult[] = [];
      
      // Get AppState data from localStorage
      const appStateData = localStorage.getItem('lawfirm_app_data') || localStorage.getItem('beacon-app-state');
      let appState: any = {};
      
      if (appStateData) {
        try {
          appState = JSON.parse(appStateData);
        } catch (e) {
          console.warn('Failed to parse app state:', e);
        }
      }

      // Add cases if scope allows
      if (scope === 'all' || scope === 'cases') {
        const cases = appState.cases || [];
        cases.forEach((caseItem: any) => {
          results.push({
            type: 'case',
            id: caseItem.id,
            title: caseItem.title || `Case ${caseItem.caseNumber}`,
            subtitle: `${caseItem.caseNumber || 'N/A'} • ${caseItem.clientName || 'Unknown Client'} • ${caseItem.stage || 'Unknown Stage'}`,
            url: `/cases/${caseItem.id}`,
            score: 1.0,
            highlights: [caseItem.description || caseItem.title || caseItem.caseNumber || ''],
            badges: [caseItem.stage || 'Case', caseItem.clientName || 'Unknown Client']
          });
        });
      }

      // Add hearings if scope allows
      if (scope === 'all' || scope === 'hearings') {
        const hearings = appState.hearings || [];
        hearings.forEach((hearing: any) => {
          const caseInfo = appState.cases?.find((c: any) => c.id === hearing.caseId);
          const caseTitle = caseInfo?.title || `Case ${caseInfo?.caseNumber || 'Unknown'}`;
          
          results.push({
            type: 'hearing',
            id: hearing.id,
            title: hearing.agenda || hearing.title || `Hearing ${hearing.id}`,
            subtitle: `${caseTitle} • ${hearing.court || 'Unknown Court'} • ${hearing.date || 'Unknown Date'}`,
            url: `/hearings/${hearing.id}`,
            score: 1.0,
            highlights: [hearing.agenda || hearing.notes || hearing.title || ''],
            badges: [hearing.court || 'Hearing', hearing.outcome || 'Scheduled']
          });
        });
      }

      // Add tasks if scope allows
      if (scope === 'all' || scope === 'tasks') {
        const tasks = appState.tasks || [];
        tasks.forEach((task: any) => {
          const caseInfo = appState.cases?.find((c: any) => c.id === task.caseId);
          const caseTitle = caseInfo?.title || `Case ${caseInfo?.caseNumber || 'Unknown'}`;
          
          results.push({
            type: 'task',
            id: task.id,
            title: task.title || `Task ${task.id}`,
            subtitle: `${caseTitle} • Due: ${task.dueDate || 'No due date'} • ${task.status || 'Unknown Status'}`,
            url: `/tasks/${task.id}`,
            score: 1.0,
            highlights: [task.description || task.title || ''],
            badges: [task.status || 'Task', task.priority || 'Normal']
          });
        });
      }

      // Add clients if scope allows
      if (scope === 'all' || scope === 'clients') {
        const clients = appState.clients || [];
        clients.forEach((client: any) => {
          results.push({
            type: 'client',
            id: client.id,
            title: client.name || `Client ${client.id}`,
            subtitle: `${client.gstin || 'No GSTIN'} • ${client.businessType || 'Unknown Business'} • ${client.email || 'No Email'}`,
            url: `/clients/${client.id}`,
            score: 1.0,
            highlights: [client.address || client.name || ''],
            badges: [client.businessType || 'Client', client.gstin ? 'GST Registered' : 'No GST']
          });
        });
      }

      // Add documents if scope allows
      if (scope === 'all' || scope === 'documents') {
        const documents = Array.isArray(appState.documents) ? appState.documents : [];
        const folders = Array.isArray(appState.folders) ? appState.folders : [];
        
        // Create a map of folder IDs to folder names for better context
        const folderMap = new Map<string, string>();
        folders.forEach((folder: any) => {
          if (folder && folder.id) {
            folderMap.set(folder.id, folder.name || 'Folder');
          }
        });

        documents.forEach((doc: any) => {
          const folderName = doc.folderId ? folderMap.get(doc.folderId) || 'Root' : 'Root';
          const ext = (doc.name?.split('.').pop() || '').toLowerCase();

          results.push({
            type: 'document',
            id: doc.id,
            title: doc.name,
            subtitle: `${folderName} • ${ext || (doc.type || 'document')} • ${doc.size ? `${Math.round(doc.size / 1024)} KB` : 'Unknown size'}`,
            url: `/documents?search=${encodeURIComponent(doc.name)}`,
            score: 1.0,
            highlights: [doc.tags?.join(', ') || '', doc.path || '', doc.uploadedByName || ''],
            badges: [ext || (doc.type || 'Document'), folderName]
          });
        });
      }

      return results;
    } catch (error) {
      console.warn('Failed to load dynamic results for search:', error);
      return [];
    }
  }

  /**
   * Text normalization for robust matching (case, dashes/underscores, punctuation)
   */
  private normalize(text: string): string {
    return (text || '')
      .toLowerCase()
      .replace(/[_-]+/g, ' ')
      .replace(/[^a-z0-9\s]+/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Calculate demo search score
   */
  private calculateDemoScore(item: SearchResult, searchTerms: string[]): number {
    let score = 0;
    const titleNorm = this.normalize(item.title);
    const subtitleNorm = this.normalize(item.subtitle);
    const queryNorm = searchTerms.join(' ');

    // Exact phrase match in title gets highest score
    if (titleNorm.includes(queryNorm)) {
      score += 10;
    }

    // Individual term matches
    searchTerms.forEach(term => {
      if (titleNorm.includes(term)) score += 3;
      if (subtitleNorm.includes(term)) score += 2;
      if (item.highlights.some(h => this.normalize(h).includes(term))) score += 1;
      if (item.badges.some(b => this.normalize(b).includes(term))) score += 0.5;
    });

    // Boost score for exact normalized title matches
    if (titleNorm === queryNorm) {
      score += 20;
    }

    // Boost score for data from AppState (more relevant than static demo data)
    if (item.type === 'case' || item.type === 'hearing' || item.type === 'task' || item.type === 'client' || item.type === 'document') {
      score += 5;
    }

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
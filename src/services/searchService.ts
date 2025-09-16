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
    this.providerReady = this.initProvider();
  }

  /**
   * Initialize search provider once on boot and persist decision
   */
  public async initProvider(): Promise<void> {
    // Check if provider is already determined in this session
    const sessionProvider = sessionStorage.getItem('search_provider') as SearchProvider;
    if (sessionProvider && (sessionProvider === 'API' || sessionProvider === 'DEMO')) {
      this.provider = sessionProvider;
      console.log(`🔍 Search provider loaded from session:`, this.provider);
      return;
    }

    // Determine provider based on API availability
    let provider: SearchProvider = 'DEMO';
    
    if (envConfig.API_SET) {
      try {
        // Test API reachability with 1500ms timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);
        
        try {
          // Try search ping endpoint first, fallback to health check
          let pingUrl = `${envConfig.API}/api/search/ping`;
          let response = await fetch(pingUrl, { 
            method: 'GET',
            signal: controller.signal 
          });
          
          if (!response.ok) {
            // Fallback to health endpoint
            pingUrl = `${envConfig.API}/api/health`;
            response = await fetch(pingUrl, { 
              method: 'GET',
              signal: controller.signal 
            });
          }
          
          if (!response.ok) {
            // Last fallback - try a small search request
            pingUrl = `${envConfig.API}/api/search/suggest?q=ping&limit=1`;
            response = await fetch(pingUrl, { 
              method: 'GET',
              signal: controller.signal 
            });
          }
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            provider = 'API';
            console.log(`🔍 API reachable at ${pingUrl}, using API provider`);
          } else {
            console.log(`🔍 API not responsive (${response.status}), falling back to DEMO`);
          }
        } catch (fetchError) {
          clearTimeout(timeoutId);
          console.log(`🔍 API unreachable, falling back to DEMO:`, fetchError.message);
        }
      } catch (error) {
        console.log(`🔍 API ping failed, using DEMO provider:`, error.message);
      }
    } else if (envConfig.QA_ON || envConfig.MOCK_ON || !envConfig.API_SET) {
      provider = 'DEMO';
      console.log(`🔍 Using DEMO provider due to environment config`);
    }

    this.provider = provider;
    sessionStorage.setItem('search_provider', provider);
    console.log(`🔍 Search provider determined and persisted:`, provider);
    
    // Notify subscribers
    this.providerSubscribers.forEach(callback => callback(provider));
  }

  /**
   * Get current search provider
   */
  public getProvider(): SearchProvider | null {
    return this.provider;
  }

  /**
   * Subscribe to provider changes
   */
  public subscribeProvider(callback: (provider: SearchProvider) => void): () => void {
    this.providerSubscribers.push(callback);
    if (this.provider) {
      callback(this.provider);
    }
    return () => {
      const index = this.providerSubscribers.indexOf(callback);
      if (index > -1) {
        this.providerSubscribers.splice(index, 1);
      }
    };
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

      // Debug logging for document discovery
      if (this.isDevModeOn() && (scope === 'all' || scope === 'documents')) {
        console.log('🔍 Search Debug - Query:', query);
        console.log('🔍 Search Debug - AppState keys:', Object.keys(appState));
        console.log('🔍 Search Debug - Documents in state:', appState.documents?.length || 0);
        if (appState.documents?.length > 0) {
          console.log('🔍 Search Debug - First few document names:', 
            appState.documents.slice(0, 5).map((d: any) => d.name || d.title));
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
        
        // Debug logging for document search
        if (this.isDevModeOn()) {
          console.log('🔍 Document Search Debug - Found documents:', documents.length);
          const queryNormalized = this.normalize(query);
          const queryExact = query.toLowerCase().trim();
          console.log('🔍 Document Search Debug - Query normalized:', queryNormalized);
          console.log('🔍 Document Search Debug - Query exact:', queryExact);
        }
        
        // Create a map of folder IDs to folder names for better context
        const folderMap = new Map<string, string>();
        folders.forEach((folder: any) => {
          if (folder && folder.id) {
            folderMap.set(folder.id, folder.name || 'Folder');
          }
        });

        documents.forEach((doc: any) => {
          if (!doc || !doc.name) return; // Skip invalid documents
          
          const folderName = doc.folderId ? folderMap.get(doc.folderId) || 'Root' : 'Root';
          const ext = (doc.name?.split('.').pop() || '').toLowerCase();
          const docNameNormalized = this.normalize(doc.name);
          const docNameExact = doc.name.toLowerCase().trim();

          // Debug logging for specific document matching
          if (this.isDevModeOn() && docNameExact.includes(query.toLowerCase().trim())) {
            console.log('🔍 Found potential match:', {
              docName: doc.name,
              docNameNormalized,
              docNameExact,
              queryExact: query.toLowerCase().trim()
            });
          }

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
   * Enhanced to handle filenames better
   */
  private normalize(text: string): string {
    if (!text) return '';
    
    // For better filename matching, preserve some structure
    return text
      .toLowerCase()
      .replace(/[_-]+/g, ' ')  // Convert underscores and dashes to spaces
      .replace(/\./g, ' ')     // Convert dots to spaces (for file extensions)
      .replace(/[^a-z0-9\s]/gi, ' ')  // Remove other special chars
      .replace(/\s+/g, ' ')    // Collapse multiple spaces
      .trim();
  }

  /**
   * Check for exact filename match (case-insensitive)
   */
  private isExactFilenameMatch(filename: string, query: string): boolean {
    return filename.toLowerCase().trim() === query.toLowerCase().trim();
  }

  /**
   * Check for partial filename match (without normalization)
   */
  private isPartialFilenameMatch(filename: string, query: string): boolean {
    return filename.toLowerCase().includes(query.toLowerCase());
  }

  /**
   * Calculate demo search score with enhanced filename matching
   */
  private calculateDemoScore(item: SearchResult, searchTerms: string[]): number {
    let score = 0;
    const titleNorm = this.normalize(item.title);
    const subtitleNorm = this.normalize(item.subtitle);
    const queryNorm = searchTerms.join(' ');
    const fullQuery = searchTerms.join(' ');

    // For documents, prioritize exact filename matches
    if (item.type === 'document') {
      // Highest score for exact filename match (case-insensitive)
      if (this.isExactFilenameMatch(item.title, fullQuery)) {
        score += 100;
        console.log('🎯 Exact filename match found:', item.title, 'Score:', score);
      }
      
      // High score for partial filename match (without normalization)
      if (this.isPartialFilenameMatch(item.title, fullQuery)) {
        score += 50;
        console.log('🎯 Partial filename match found:', item.title, 'Score:', score);
      }
    }

    // Exact phrase match in title gets high score
    if (titleNorm.includes(queryNorm)) {
      score += 20;
    }

    // Individual term matches
    searchTerms.forEach(term => {
      if (titleNorm.includes(term)) score += 5;
      if (subtitleNorm.includes(term)) score += 3;
      if (item.highlights.some(h => this.normalize(h).includes(term))) score += 2;
      if (item.badges.some(b => this.normalize(b).includes(term))) score += 1;
    });

    // Boost score for exact normalized title matches
    if (titleNorm === queryNorm) {
      score += 30;
    }

    // Boost score for data from AppState (more relevant than static demo data)
    if (item.type === 'case' || item.type === 'hearing' || item.type === 'task' || item.type === 'client' || item.type === 'document') {
      score += 10;
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
  // Removed shouldUseDemoMode() - provider is now determined once in initProvider()

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
    
    console.log('🧹 Search cache cleared');
  }

  /**
   * Force refresh search data and clear cache
   */
  async refreshSearchData(): Promise<void> {
    await this.clearCache();
    
    if (this.isDevModeOn()) {
      console.log('🔄 Search data refreshed - next search will use fresh data');
    }
  }
}

export const searchService = new SearchService();
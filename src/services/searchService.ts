/**
 * Global Search Service for Beacon Essential
 * Handles API integration and demo fallback for global search functionality
 */

import { apiService } from './apiService';
import { envConfig } from '@/utils/envConfig';
import { featureFlagService } from './featureFlagService';
import { idbStorage } from '@/utils/idb';
import { storageManager } from '@/data/StorageManager';
import { persistenceService } from '@/services/persistenceService';
import { format } from 'date-fns';
// Demo search data will be loaded dynamically

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
  total?: number;
  message?: string;
}

export interface SearchSuggestion {
  text: string;
  type?: string;
  count?: number;
}

export type SearchScope = 'all' | 'cases' | 'clients' | 'tasks' | 'documents' | 'hearings';

// Search provider types
export type SearchProvider = 'API' | 'DEMO';

// Parsed query structure for advanced search
interface ParsedQuery {
  terms: string[];
  exact?: boolean;
  filename?: string;
  tag?: string;
  uploader?: string;
  caseRef?: string;
}

// Document index entry for DEMO mode
interface DocumentIndexEntry {
  id: string;
  title: string;
  normalizedTitle: string;
  tagsNorm: string;
  uploaderNorm: string;
  caseTitleNorm: string;
  folderNorm: string;
  updatedAt: string;
}

class SearchService {
  private cache = new Map<string, { data: SearchResponse; timestamp: number }>();
  private recentSearches: Array<{ query: string; timestamp: number }> = [];
  private currentRequestController?: AbortController;
  private debounceMs = 250;
  private provider: SearchProvider | null = null;
  private providerReady: Promise<void>;
  private providerSubscribers: Array<(provider: SearchProvider) => void> = [];
  private queryHistory: Array<{ query: string; provider: SearchProvider; scope: SearchScope; duration: number; resultCount: number; timestamp: number }> = [];
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

  async search(query: string, scope: SearchScope = 'all', limit = 20, cursor?: string): Promise<SearchResponse> {
    // Wait for provider to be ready
    await this.providerReady;
    
    if (!query.trim()) {
      return { results: [], total: 0 };
    }

    const cacheKey = `${query}-${scope}-${limit}-${cursor || ''}`;
    const cachedResult = this.getCachedResult(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    // Cancel previous request
    if (this.currentRequestController) {
      this.currentRequestController.abort();
    }

    this.currentRequestController = new AbortController();

    const startTime = Date.now();
    
    try {
      console.log('🔍 SearchService - Starting search:', { query, scope, limit, cursor, provider: this.provider });
      
      let response: SearchResponse = { results: [], total: 0 };

      // Use locked provider - no fallback switching
      if (this.provider === 'API') {
        response = await this.searchAPI(query, scope, limit, cursor);
        console.log('🔍 SearchService - API search complete:', { 
          resultsCount: response.results.length,
          hasNextCursor: Boolean(response.next_cursor)
        });
      } else {
        response = await this.searchDemo(query, scope, limit, cursor);
        console.log('🔍 SearchService - Demo search complete:', { 
          resultsCount: response.results.length,
          hasNextCursor: Boolean(response.next_cursor)
        });
      }

      // Cache the result
      this.cache.set(cacheKey, {
        data: response,
        timestamp: Date.now()
      });

      const duration = Date.now() - startTime;
      
      // Track in query history
      this.queryHistory.unshift({
        query,
        provider: this.provider!,
        scope,
        duration,
        resultCount: response.results.length,
        timestamp: Date.now()
      });
      
      // Keep only last 10 queries
      if (this.queryHistory.length > 10) {
        this.queryHistory = this.queryHistory.slice(0, 10);
      }

      // Add to recent searches
      this.addToRecentSearches(query);

      return response;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('🔍 SearchService - Search aborted');
        throw error;
      }
      console.error('🔍 SearchService - Search error:', error);
      throw error;
    }
  }

  async suggest(query: string, limit = 8): Promise<SearchSuggestion[]> {
    // Wait for provider to be ready
    await this.providerReady;
    
    if (!query.trim()) {
      return [];
    }

    try {
      // Use locked provider - no fallback switching
      if (this.provider === 'API') {
        return await this.suggestAPI(query, limit);
      } else {
        return await this.suggestDemo(query, limit);
      }
    } catch (error) {
      console.error('Search suggest error:', error);
      return [];
    }
  }

  private async searchAPI(query: string, scope: SearchScope, limit: number, cursor?: string): Promise<SearchResponse> {
    console.log('🔍 SearchService - Using API search');
    
    const parsedQuery = this.parseQuery(query);
    
    try {
      const params: Record<string, any> = {
        q: parsedQuery.terms.join(' '),
        scope,
        limit,
      };
      if (cursor) params.cursor = cursor;
      if (parsedQuery.exact) params.exact = 'true';
      if (parsedQuery.filename) params.filename = parsedQuery.filename;
      if (parsedQuery.tag) params.tag = parsedQuery.tag;
      if (parsedQuery.uploader) params.uploader = parsedQuery.uploader;
      if (parsedQuery.caseRef) params.case = parsedQuery.caseRef;

      const response = await apiService.get<SearchResponse>('/api/search', params);
      if (!response.success) {
        return { results: [], total: 0, message: response.error || 'Search failed' };
      }
      return response.data || { results: [], total: 0 };
    } catch (error) {
      // For now, return empty results as API may not be implemented
      console.warn('🔍 API search failed, returning empty results');
      await new Promise(resolve => setTimeout(resolve, 200));
      return { results: [], total: 0, message: `API search for "${query}" in ${scope} scope - failed` };
    }
  }

  private async suggestAPI(query: string, limit: number): Promise<SearchSuggestion[]> {
    console.log('🔍 SearchService - Using API suggest');
    
    const parsedQuery = this.parseQuery(query);
    
    try {
      const params: Record<string, any> = {
        q: parsedQuery.terms.join(' '),
        limit,
      };
      if (parsedQuery.exact) params.exact = 'true';

      const response = await apiService.get<SearchSuggestion[]>('/api/search/suggest', params);
      if (!response.success) {
        return [];
      }
      return (response.data as any) || [];
    } catch (error) {
      // For now, return empty suggestions as API may not be implemented
      console.warn('🔍 API suggest failed, returning empty suggestions');
      await new Promise(resolve => setTimeout(resolve, 100));
      return [];
    }
  }

  private async searchDemo(query: string, scope: SearchScope, limit: number, cursor?: string): Promise<SearchResponse> {
    console.log('🔍 SearchService - Using DEMO search');
    
    // Ensure IndexedDB is initialized (this is safe to call multiple times)
    try {
      const storage = storageManager.getStorage();
      if (!storage) {
        await storageManager.initialize('indexeddb');
      }
    } catch (error) {
      // Storage not initialized yet, try to initialize
      try {
        await storageManager.initialize('indexeddb');
      } catch (initError) {
        console.warn('⚠️ IndexedDB initialization failed:', initError);
        return { results: [], total: 0, next_cursor: undefined };
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
    
    const parsedQuery = this.parseQuery(query);
    let allResults: SearchResult[] = [];

    // Get dynamic results from IndexedDB with parsed query
    const dynamicResults = await this.getDynamicResults(parsedQuery, scope);
    
    console.log('🔍 SearchService - Dynamic results from IndexedDB:', {
      count: dynamicResults.length,
      parsedQuery,
      types: dynamicResults.reduce((acc, r) => {
        acc[r.type] = (acc[r.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    });
    
    allResults.push(...dynamicResults);

    // Skip demo data for now - focus on dynamic results
    // Demo data integration can be added later if needed

    // Sort by relevance score
    allResults.sort((a, b) => b.score - a.score);

    // Apply pagination if cursor is provided
    const startIndex = cursor ? parseInt(cursor) : 0;
    const endIndex = startIndex + limit;
    const paginatedResults = allResults.slice(startIndex, endIndex);
    const nextCursor = endIndex < allResults.length ? endIndex.toString() : undefined;

    return {
      results: paginatedResults,
      total: allResults.length,
      next_cursor: nextCursor
    };
  }

  private async suggestDemo(query: string, limit: number): Promise<SearchSuggestion[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const parsedQuery = this.parseQuery(query);
    const suggestions: SearchSuggestion[] = [];
    
    // Get suggestions from dynamic data
    const dynamicSuggestions = await this.getDynamicSuggestions(parsedQuery, limit);
    suggestions.push(...dynamicSuggestions);
    
    // Skip demo data suggestions for now
    
    return suggestions.slice(0, limit);
  }

  /**
   * Parse query into structured format with operators and normalization
   */
  private parseQuery(query: string): ParsedQuery {
    const result: ParsedQuery = { terms: [] };
    
    if (this.isDevModeOn()) {
      console.log('🔍 ParseQuery - Input:', query);
    }
    
    // Check for exact match (quotes or full filename)
    const exactMatch = query.match(/^"([^"]+)"$/) || query.match(/^([^"\s]+\.(pdf|docx?|xlsx?|txt|html))$/i);
    if (exactMatch) {
      result.exact = true;
      result.terms = [this.normalize(exactMatch[1])];
      if (this.isDevModeOn()) {
        console.log('🔍 ParseQuery - Exact match found:', result);
      }
      return result;
    }
    
    // Parse operators
    const operators = {
      filename: /filename:(\S+)/gi,
      tag: /tag:(\S+)/gi,
      uploader: /uploader:(\S+)/gi,
      case: /case:(\S+)/gi
    };
    
    let remainingQuery = query;
    
    Object.entries(operators).forEach(([key, regex]) => {
      const matches = [...remainingQuery.matchAll(regex)];
      matches.forEach(match => {
        const targetKey = key === 'case' ? 'caseRef' : key;
        (result as any)[targetKey] = match[1];
        remainingQuery = remainingQuery.replace(match[0], '').trim();
      });
    });
    
    // Normalize remaining terms
    if (remainingQuery.trim()) {
      const normalized = this.normalize(remainingQuery);
      result.terms = normalized
        .split(/\s+/)
        .filter(term => term.length > 0);
      
      if (this.isDevModeOn()) {
        console.log('🔍 ParseQuery - Normalized:', { 
          original: remainingQuery, 
          normalized, 
          terms: result.terms 
        });
      }
    }
    
    return result;
  }

  /**
   * Check if an item matches the parsed query
   */
  private matchesParsedQuery(item: any, parsedQuery: ParsedQuery): boolean {
    // Apply operator filters first
    if (parsedQuery.filename) {
      const normalizedFilename = this.normalize(parsedQuery.filename);
      const itemTitle = this.normalize(item.title);
      if (!itemTitle.includes(normalizedFilename)) {
        return false;
      }
    }
    
    if (parsedQuery.tag && item.metadata?.tags) {
      const normalizedTag = this.normalize(parsedQuery.tag);
      const itemTags = item.metadata.tags.map((tag: string) => this.normalize(tag));
      if (!itemTags.some((tag: string) => tag.includes(normalizedTag))) {
        return false;
      }
    }
    
    if (parsedQuery.uploader && item.metadata?.uploader) {
      const normalizedUploader = this.normalize(parsedQuery.uploader);
      const itemUploader = this.normalize(item.metadata.uploader);
      if (!itemUploader.includes(normalizedUploader)) {
        return false;
      }
    }
    
    if (parsedQuery.caseRef && item.metadata?.caseId) {
      const normalizedCase = this.normalize(parsedQuery.caseRef);
      const itemCase = this.normalize(item.metadata.caseId);
      if (!itemCase.includes(normalizedCase)) {
        return false;
      }
    }
    
    // Check free-text terms
    if (parsedQuery.terms.length > 0) {
      const normalizedTitle = this.normalize(item.title);
      const normalizedContent = this.normalize(item.content || '');
      
      if (parsedQuery.exact) {
        // For exact matches, all terms must match in sequence
        const searchText = parsedQuery.terms.join(' ');
        return normalizedTitle.includes(searchText) || normalizedContent.includes(searchText);
      } else {
        // For regular matches, all terms must be present
        return parsedQuery.terms.every(term =>
          normalizedTitle.includes(term) || normalizedContent.includes(term)
        );
      }
    }
    
    return true;
  }

  /**
   * Fetch entities from both Dexie (StorageManager) and KV (persistenceService)
   * Merge and deduplicate, preferring Dexie records when available
   */
  private async fetchEntities(entity: 'documents' | 'cases' | 'clients' | 'tasks' | 'hearings'): Promise<{ items: any[], source: string }> {
    let dexieItems: any[] = [];
    let kvItems: any[] = [];
    
    // Try Dexie first
    try {
      const storage = storageManager.getStorage();
      if (storage) {
        dexieItems = (await storage.getAll(entity)) as any[];
      }
    } catch (error) {
      console.warn(`[Search] Dexie fetch failed for ${entity}:`, error);
    }
    
    // Fallback to KV store
    try {
      kvItems = await persistenceService.getAll(entity);
    } catch (error) {
      console.warn(`[Search] KV fetch failed for ${entity}:`, error);
    }
    
    // Merge and deduplicate (prefer Dexie when ID exists in both)
    const dexieIds = new Set(dexieItems.map(item => item.id));
    const merged = [
      ...dexieItems,
      ...kvItems.filter(item => !dexieIds.has(item.id))
    ];
    
    const source = dexieItems.length > 0 && kvItems.length > 0 ? 'dexie+kv' 
                 : dexieItems.length > 0 ? 'dexie' 
                 : kvItems.length > 0 ? 'kv' 
                 : 'none';
    
    if (this.isDevModeOn() && merged.length > 0) {
      console.log(`[Search] Fetched ${entity}:`, {
        dexie: dexieItems.length,
        kv: kvItems.length,
        merged: merged.length,
        source
      });
    }
    
    return { items: merged, source };
  }

  private async getDynamicResults(parsedQuery: ParsedQuery, scope: SearchScope): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const normalizedQuery = parsedQuery.terms.join(' ');
    
    try {
      // Fetch data from both Dexie and KV stores
      const documentsData = scope === 'all' || scope === 'documents' 
        ? await this.fetchEntities('documents')
        : { items: [], source: 'none' };
      const casesData = scope === 'all' || scope === 'cases' 
        ? await this.fetchEntities('cases')
        : { items: [], source: 'none' };
      const clientsData = scope === 'all' || scope === 'clients' 
        ? await this.fetchEntities('clients')
        : { items: [], source: 'none' };
      const tasksData = scope === 'all' || scope === 'tasks' 
        ? await this.fetchEntities('tasks')
        : { items: [], source: 'none' };
      const hearingsData = scope === 'all' || scope === 'hearings' 
        ? await this.fetchEntities('hearings')
        : { items: [], source: 'none' };

      const documents = documentsData.items;
      const cases = casesData.items;
      const clients = clientsData.items;
      const tasks = tasksData.items;
      const hearings = hearingsData.items;

      // For case and hearing search, we need all clients and cases to resolve names
      const allClients = ((scope === 'all' || scope === 'cases' || scope === 'hearings') && clients.length === 0)
        ? (await this.fetchEntities('clients')).items
        : clients;
      
      const allCases = ((scope === 'all' || scope === 'hearings') && cases.length === 0)
        ? (await this.fetchEntities('cases')).items
        : cases;
      
      // Create lookup maps - handle both old (KV) and new (Dexie) schema field names
      const clientLookup = new Map(allClients.map(c => [c.id, c.display_name || c.name || '']));
      const caseLookup = new Map(allCases.map(c => [c.id, c]));

      // Debug logging
      if (this.isDevModeOn()) {
        console.log('🔍 SearchService - IndexedDB data loaded:', {
          documents: documents.length,
          cases: cases.length,
          clients: allClients.length,
          tasks: tasks.length,
          hearings: hearings.length,
          sampleDoc: documents[0]?.name || 'No documents',
          sampleCase: cases[0] ? { 
            id: cases[0].id, 
            title: cases[0].title,
            title_type: typeof cases[0].title,
            case_number: cases[0].case_number,
            case_number_type: typeof cases[0].case_number,
            client_id: cases[0].client_id,
            client_id_type: typeof cases[0].client_id,
            clientName: allClients.length > 0 ? clientLookup.get(cases[0].client_id) : 'No clients loaded'
          } : 'No cases',
          sampleClient: allClients[0] ? {
            id: allClients[0].id,
            display_name: allClients[0].display_name,
            display_name_type: typeof allClients[0].display_name
          } : 'No clients'
        });
      }

      // Document search with comprehensive filename matching
      if (scope === 'all' || scope === 'documents') {
        documents.forEach(doc => {
          // Handle both schemas: Dexie (name, doc_type_code, uploaded_by_name, case_id) and KV (file_name, type, uploadedByName, caseId)
          const docTitle = doc.name || doc.file_name || 'Untitled Document';
          const docType = doc.doc_type_code || doc.type || 'Document';
          const docUploader = doc.uploaded_by_name || doc.uploadedByName;
          const docCaseId = doc.case_id || doc.caseId;
          const docFolderId = doc.folder_id || doc.folderId;
          
          const docItem = {
            title: docTitle,
            content: `${docType} ${doc.size || 0} bytes`,
            metadata: {
              uploader: docUploader,
              caseId: docCaseId,
              folder: docFolderId
            }
          };
          
          if (this.matchesParsedQuery(docItem, parsedQuery)) {
            // Enhanced filename matching logic
            const isExactFilename = this.isExactFilenameMatch(docTitle, parsedQuery);
            const isPartialFilename = this.isPartialFilenameMatch(docTitle, parsedQuery);
            
            let score = this.calculateDemoScore(docTitle, docType, parsedQuery);
            
            // Boost scores for filename matches
            if (isExactFilename) score += 100;
            else if (isPartialFilename) score += 50;
            
            // Boost for operator matches
            if (parsedQuery.filename) score += 15;
            if (parsedQuery.uploader) score += 10;
            if (parsedQuery.caseRef) score += 10;
            
            results.push({
              id: doc.id,
              title: docTitle,
              subtitle: `${docType} • ${doc.size || 0} bytes • Uploaded by ${docUploader || 'Unknown'}`,
              url: `/documents?search=${encodeURIComponent(docTitle)}`,
              type: 'document',
              score: score,
              highlights: [docTitle],
              badges: [docType]
            });
          }
        });
      }

      // Cases search - handle both schemas: Dexie (title, case_number, client_id) and KV (case_title, caseNumber, clientId)
      if (scope === 'all' || scope === 'cases') {
        cases.forEach(case_ => {
          // Defensive: handle malformed data where fields might be objects instead of strings
          const caseTitle = (typeof case_.title === 'string' ? case_.title : null) 
            || (typeof case_.case_title === 'string' ? case_.case_title : null)
            || (typeof case_.case_number === 'string' ? case_.case_number : null) 
            || (typeof case_.caseNumber === 'string' ? case_.caseNumber : null)
            || '';
          const caseNumber = (typeof case_.case_number === 'string' ? case_.case_number : '')
            || (typeof case_.caseNumber === 'string' ? case_.caseNumber : '');
          const clientId = (typeof case_.client_id === 'string' ? case_.client_id : '')
            || (typeof case_.clientId === 'string' ? case_.clientId : '');
          // Resolve client name from lookup (handles both display_name and name)
          const clientName = clientId ? (clientLookup.get(clientId) || '') : '';
          const caseStatus = case_.status || 'Active';
          
          const caseItem = {
            title: caseTitle,
            content: `${clientName} ${caseNumber} ${case_.description || ''}`,
            metadata: {
              caseId: case_.id,
              uploader: clientName
            }
          };
          
          if (this.matchesParsedQuery(caseItem, parsedQuery)) {
            results.push({
              id: case_.id,
              title: caseTitle,
              subtitle: `Case ${caseNumber || 'N/A'} • ${clientName || 'Unknown Client'} • ${caseStatus}`,
              url: `/cases?caseId=${case_.id}`,
              type: 'case',
              score: this.calculateDemoScore(caseTitle, clientName, parsedQuery),
              highlights: [caseTitle],
              badges: [caseStatus]
            });
          }
        });
      }

      // Clients search - handle both schemas: Dexie (display_name) and KV (name)
      if (scope === 'all' || scope === 'clients') {
        clients.forEach(client => {
          const clientName = client.display_name || client.name || 'Unknown Client';
          const clientGstin = client.gstin || '';
          const clientCity = client.city || '';
          const clientState = client.state || '';
          
          const clientItem = {
            title: clientName,
            content: `${clientGstin} ${clientCity} ${clientState}`,
            metadata: {}
          };
          
          if (this.matchesParsedQuery(clientItem, parsedQuery)) {
            const subtitleParts = [clientGstin, clientCity, clientState].filter(Boolean);
            results.push({
              id: client.id,
              title: clientName,
              subtitle: subtitleParts.join(' • ') || 'Client',
              url: `/clients?search=${encodeURIComponent(clientName)}`,
              type: 'client',
              score: this.calculateDemoScore(clientName, `${clientGstin} ${clientCity}`, parsedQuery),
              highlights: [clientName],
              badges: ['Client']
            });
          }
        });
      }

      // Tasks search - handle both schemas: Dexie (case_id) and KV (caseId)
      if (scope === 'all' || scope === 'tasks') {
        tasks.forEach(task => {
          const taskCaseId = task.case_id || task.caseId;
          // If task has case_id, include case and client info in content
          let enrichedContent = task.description || '';
          if (taskCaseId) {
            const relatedCase = caseLookup.get(taskCaseId);
            if (relatedCase) {
              const relatedCaseClientId = relatedCase.client_id || relatedCase.clientId;
              const relatedClientName = clientLookup.get(relatedCaseClientId) || '';
              const relatedCaseTitle = relatedCase.title || relatedCase.case_title || '';
              const relatedCaseNumber = relatedCase.case_number || relatedCase.caseNumber || '';
              enrichedContent += ` ${relatedCaseTitle} ${relatedCaseNumber} ${relatedClientName}`;
            }
          }
          
          const taskItem = {
            title: task.title || '',
            content: enrichedContent,
            metadata: {}
          };
          
          if (this.matchesParsedQuery(taskItem, parsedQuery)) {
            results.push({
              id: task.id,
              title: task.title || 'Untitled Task',
              subtitle: task.description || 'No description',
              url: `/tasks?highlight=${task.id}`,
              type: 'task',
              score: this.calculateDemoScore(task.title || '', enrichedContent, parsedQuery),
              highlights: [task.description || ''],
              badges: [task.status || 'Pending']
            });
          }
        });
      }

      // Hearings search - handle both schemas: Dexie (case_id, hearing_date) and KV (caseId, date)
      if (scope === 'all' || scope === 'hearings') {
        hearings.forEach(hearing => {
          const hearingCaseId = hearing.case_id || hearing.caseId;
          // Fetch related case and client to enable search by client name and case title
          const relatedCase = caseLookup.get(hearingCaseId);
          const relatedCaseClientId = relatedCase ? (relatedCase.client_id || relatedCase.clientId) : '';
          const relatedClientName = relatedCaseClientId ? (clientLookup.get(relatedCaseClientId) || '') : '';
          const caseTitle = relatedCase?.title || relatedCase?.case_title || '';
          const caseNumber = relatedCase?.case_number || relatedCase?.caseNumber || '';
          
          // Compose title and content with case and client info
          const hearingTitle = caseNumber 
            ? `${caseNumber} - ${caseTitle || 'Hearing'}`
            : caseTitle || 'Hearing';
          
          const hearingItem = {
            title: hearingTitle,
            content: `${relatedClientName} ${caseNumber} ${caseTitle} ${hearing.notes || ''} ${hearing.location || ''}`,
            metadata: {
              caseId: hearingCaseId
            }
          };
          
          if (this.matchesParsedQuery(hearingItem, parsedQuery)) {
            const hearingDate = hearing.hearing_date || hearing.date;
            // Format hearing date - handle both schemas
            const hearingDateStr = hearingDate 
              ? format(new Date(hearingDate), 'MMM dd, yyyy')
              : 'Date TBD';
            
            results.push({
              id: hearing.id,
              title: hearingTitle,
              subtitle: `${caseNumber || 'N/A'} • ${caseTitle || 'Case'} • ${hearingDateStr}`,
              url: `/hearings?search=${encodeURIComponent(caseNumber || caseTitle || relatedClientName || '')}`,
              type: 'hearing',
              score: this.calculateDemoScore(hearingTitle, `${relatedClientName} ${caseTitle}`, parsedQuery),
              highlights: [caseTitle || hearingTitle],
              badges: ['Hearing']
            });
          }
        });
      }
    } catch (error) {
      console.error('🔍 SearchService - Failed to load from IndexedDB:', error);
    }
    
    return results;
  }

  private async getDynamicSuggestions(parsedQuery: ParsedQuery, limit: number): Promise<SearchSuggestion[]> {
    const suggestions: SearchSuggestion[] = [];
    
    try {
      // Fetch from both Dexie and KV stores
      const documentsData = await this.fetchEntities('documents');
      const casesData = await this.fetchEntities('cases');
      const clientsData = await this.fetchEntities('clients');
      
      const documents = documentsData.items;
      const cases = casesData.items;
      const clients = clientsData.items;
      
      // Document suggestions - handle both schemas
      documents.forEach(doc => {
        if (suggestions.length >= limit) return;
        
        const docTitle = doc.name || doc.file_name || '';
        const docType = doc.doc_type_code || doc.type || '';
        const docUploader = doc.uploaded_by_name || doc.uploadedByName;
        
        const docItem = {
          title: docTitle,
          content: docType,
          metadata: {
            uploader: docUploader
          }
        };
        
        if (this.matchesParsedQuery(docItem, parsedQuery)) {
          suggestions.push({
            text: docTitle || 'Untitled',
            type: 'document',
            count: 1
          });
        }
      });
      
      // Case suggestions - handle both schemas
      cases.forEach(case_ => {
        if (suggestions.length >= limit) return;
        
        const caseTitle = case_.title || case_.case_title || case_.case_number || case_.caseNumber || '';
        
        const caseItem = {
          title: caseTitle,
          content: case_.description || '',
          metadata: {}
        };
        
        if (this.matchesParsedQuery(caseItem, parsedQuery)) {
          suggestions.push({
            text: caseTitle || 'Untitled Case',
            type: 'case',
            count: 1
          });
        }
      });
      
      // Client suggestions - handle both schemas
      clients.forEach(client => {
        if (suggestions.length >= limit) return;
        
        const clientName = client.display_name || client.name || '';
        const clientGstin = client.gstin || '';
        const clientCity = client.city || '';
        
        const clientItem = {
          title: clientName,
          content: `${clientGstin} ${clientCity}`,
          metadata: {}
        };
        
        if (this.matchesParsedQuery(clientItem, parsedQuery)) {
          suggestions.push({
            text: clientName || 'Unknown Client',
            type: 'client',
            count: 1
          });
        }
      });
    } catch (error) {
      console.error('Failed to get suggestions:', error);
    }
    
    return suggestions;
  }

  private normalize(text: string): string {
    return text.toLowerCase()
      .trim()
      .replace(/[_-]/g, ' ')  // Treat _ and - as spaces
      .replace(/\s+/g, ' ')    // Collapse whitespace
      .replace(/[^\w\s]/g, ''); // Remove special chars except word chars and spaces
  }

  private isExactFilenameMatch(filename: string, parsedQuery: ParsedQuery): boolean {
    const normalizedFilename = this.normalize(filename);
    
    // Check against parsed query terms or filename operator
    const searchTarget = parsedQuery.filename || parsedQuery.terms.join(' ');
    const normalizedQuery = this.normalize(searchTarget);
    
    // Check for exact match with or without extension
    if (normalizedFilename === normalizedQuery) return true;
    
    // Check filename without extension
    const filenameWithoutExt = normalizedFilename.replace(/\.[^.]*$/, '');
    const queryWithoutExt = normalizedQuery.replace(/\.[^.]*$/, '');
    
    return filenameWithoutExt === queryWithoutExt;
  }

  private isPartialFilenameMatch(filename: string, parsedQuery: ParsedQuery): boolean {
    const normalizedFilename = this.normalize(filename);
    const searchTarget = parsedQuery.filename || parsedQuery.terms.join(' ');
    const normalizedQuery = this.normalize(searchTarget);
    
    // Check if filename contains the query as a substring
    if (normalizedFilename.includes(normalizedQuery)) return true;
    
    // Check if query contains the filename (for partial matching)
    if (normalizedQuery.includes(normalizedFilename)) return true;
    
    // Check individual words in the filename
    const filenameWords = normalizedFilename.split(/\s+/);
    const queryWords = normalizedQuery.split(/\s+/);
    
    return queryWords.some(queryWord => 
      filenameWords.some(fileWord => 
        fileWord.includes(queryWord) || queryWord.includes(fileWord)
      )
    );
  }

  private calculateDemoScore(title: string, content: string, parsedQuery: ParsedQuery): number {
    let score = 0;
    const normalizedTitle = this.normalize(title);
    const normalizedContent = this.normalize(content);
    
    const searchTerms = parsedQuery.terms;
    const allTerms = searchTerms.join(' ');
    
    // Exact title match gets highest score
    if (normalizedTitle === allTerms) score += 100;
    
    // Title contains all query terms
    if (searchTerms.every(term => normalizedTitle.includes(term))) score += 50;
    
    // Content contains all query terms
    if (searchTerms.every(term => normalizedContent.includes(term))) score += 25;
    
    // Boost for shorter titles (more specific)
    if (title.length < 50) score += 10;
    
    // Boost for exact word matches
    const titleWords = normalizedTitle.split(/\s+/);
    const exactMatches = searchTerms.filter(term => titleWords.includes(term));
    score += exactMatches.length * 15;
    
    // Boost for operator usage
    if (parsedQuery.filename) score += 15;
    if (parsedQuery.tag) score += 10;
    if (parsedQuery.uploader) score += 10;
    if (parsedQuery.caseRef) score += 10;
    if (parsedQuery.exact) score += 20;
    
    return Math.max(score, 1);
  }

  /**
   * Rebuild search index (API mode calls API, DEMO mode rebuilds local index)
   */
  public async rebuildIndex(scope: string = 'documents'): Promise<void> {
    await this.providerReady;
    
    if (this.provider === 'API') {
      try {
        await apiService.post(`/search/index/rebuild?scope=${scope}`);
        console.log(`🔍 API index rebuild initiated for scope: ${scope}`);
      } catch (error) {
        console.error('🔍 API index rebuild failed:', error);
        throw error;
      }
    } else {
      // DEMO mode - rebuild local mini-index
      await this.rebuildLocalIndex(scope);
    }
    
    // Clear cache to force fresh results
    this.cache.clear();
  }

  /**
   * Reindex a single document
   */
  public async reindexDocument(docId: string): Promise<void> {
    await this.providerReady;
    
    if (this.provider === 'API') {
      try {
        await apiService.post(`/search/index/doc/${docId}`);
        console.log(`🔍 API document reindex initiated for: ${docId}`);
      } catch (error) {
        console.error('🔍 API document reindex failed:', error);
        // Don't throw - make it fire-and-forget for UX
        console.warn(`🔍 Document reindex failed for ${docId}, continuing...`);
      }
    } else {
      // DEMO mode - update local mini-index
      await this.updateLocalIndex(docId);
    }
  }

  /**
   * Remove document from local index (DEMO mode only)
   */
  public async removeFromIndex(docId: string): Promise<void> {
    if (this.provider !== 'DEMO') return;
    
    try {
      console.log(`🔍 removeFromIndex (DEMO): simulated removal for ${docId}`);
      return;
    } catch (error) {
      console.warn('🔍 Failed to remove document from local index:', error);
    }
  }

  /**
   * Get index statistics
   */
  public async getIndexStats(): Promise<{ documentsCount: number; updatedAt: string }> {
    await this.providerReady;
    
    if (this.provider === 'API') {
      try {
        const response = await apiService.get('/search/index/stats');
        return { documentsCount: 0, updatedAt: new Date().toISOString() };
      } catch (error) {
        console.warn('🔍 Failed to get API index stats:', error);
        return { documentsCount: 0, updatedAt: new Date().toISOString() };
      }
    } else {
      // DEMO mode - get local index stats from AppState
      try {
        const appStateStr = localStorage.getItem('lawfirm_app_data');
        const appState = appStateStr ? JSON.parse(appStateStr) : {};
        const documents = Array.isArray(appState.documents) ? appState.documents : [];
        return {
          documentsCount: documents.length,
          updatedAt: new Date().toISOString()
        };
      } catch (error) {
        console.warn('🔍 Failed to get local index stats:', error);
        return { documentsCount: 0, updatedAt: new Date().toISOString() };
      }
    }
  }

  /**
   * Get last 10 queries for debugging
   */
  public getQueryHistory(): typeof this.queryHistory {
    return [...this.queryHistory];
  }

  /**
   * Rebuild local search index (DEMO mode)
   */
  private async rebuildLocalIndex(scope: string): Promise<void> {
    try {
      console.log(`🔍 rebuildLocalIndex (DEMO): simulated rebuild for scope: ${scope}`);
      return;
    } catch (error) {
      console.error('🔍 Failed to rebuild local index:', error);
      throw error;
    }
  }

  /**
   * Update single document in local index (DEMO mode)
   */
  private async updateLocalIndex(docId: string): Promise<void> {
    try {
      console.log(`🔍 updateLocalIndex (DEMO): simulated update for ${docId}`);
      return;
    } catch (error) {
      console.warn('🔍 Failed to update local index:', error);
    }
  }

  private getCachedResult(key: string): SearchResponse | null {
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.cacheMaxAge) {
      return cached.data;
    }
    return null;
  }

  private addToRecentSearches(query: string): void {
    this.recentSearches = this.recentSearches.filter(item => item.query !== query);
    this.recentSearches.unshift({ query, timestamp: Date.now() });
    
    if (this.recentSearches.length > this.maxRecentSearches) {
      this.recentSearches = this.recentSearches.slice(0, this.maxRecentSearches);
    }
    
    this.saveRecentSearches();
  }

  private loadRecentSearches(): void {
    try {
      const stored = localStorage.getItem('recent_searches');
      if (stored) {
        this.recentSearches = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load recent searches:', error);
      this.recentSearches = [];
    }
  }

  private saveRecentSearches(): void {
    try {
      localStorage.setItem('recent_searches', JSON.stringify(this.recentSearches));
    } catch (error) {
      console.warn('Failed to save recent searches:', error);
    }
  }

  private isDevModeOn(): boolean {
    return envConfig.QA_ON || !envConfig.API_SET || envConfig.MOCK_ON;
  }

  /**
   * Get recent searches for suggestions
   */
  public getRecentSearches(): string[] {
    return this.recentSearches.map(item => item.query);
  }

  /**
   * Clear all cached data and recent searches
   */
  public clearCache(): void {
    this.cache.clear();
    this.recentSearches = [];
    this.queryHistory = [];
    localStorage.removeItem('recent_searches');
    console.log('🔍 Search cache cleared');
  }

  /**
   * Refresh search data by clearing cache (forces fresh data fetch)
   */
  public refreshSearchData(): void {
    this.cache.clear();
    sessionStorage.removeItem('search_provider'); // Force provider re-detection on next search
    console.log('🔍 Search data refreshed - cache and provider cleared');
  }
}

export const searchService = new SearchService();

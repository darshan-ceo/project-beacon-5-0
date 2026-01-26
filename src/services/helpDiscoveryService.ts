/**
 * Help Discovery Service
 * Aggregates all help content from multiple sources into a unified, searchable index
 */

import Fuse from 'fuse.js';

export interface HelpEntry {
  id: string;
  title: string;
  description: string;
  source: 'tooltip' | 'tour' | 'article' | 'page-help' | 'operations' | 'masters' | 'faq' | 'glossary';
  module: string;
  category: string;
  roles: string[];
  uiLocation?: { path: string; tab?: string; element?: string };
  isNew?: boolean;
  updatedAt: string;
  tags: string[];
  searchText: string;
  content?: string;
  learnMoreUrl?: string;
}

export interface FilterOptions {
  source?: HelpEntry['source'][];
  module?: string[];
  roles?: string[];
  category?: string[];
  isNew?: boolean;
  updatedSince?: Date;
}

export interface OnboardingStep {
  id: string;
  type: 'tour' | 'article' | 'video' | 'quiz';
  title: string;
  description: string;
  required: boolean;
  estimatedMinutes: number;
  completed?: boolean;
}

export interface OnboardingPath {
  roleId: string;
  title: string;
  description: string;
  duration: string;
  steps: OnboardingStep[];
  completedSteps: number;
  totalSteps: number;
}

export interface ChangelogEntry {
  id: string;
  title: string;
  description: string;
  releaseDate: string;
  category: 'feature' | 'improvement' | 'fix';
  module: string;
  roles: string[];
  highlights: string[];
  learnMoreUrl?: string;
  tourId?: string;
  isRead?: boolean;
}

class HelpDiscoveryService {
  private helpIndex: HelpEntry[] = [];
  private fuseInstance: Fuse<HelpEntry> | null = null;
  private isLoaded = false;
  private loadPromise: Promise<void> | null = null;
  private uiLocations: Record<string, any> = {};
  private changelog: ChangelogEntry[] = [];
  private onboardingPaths: Record<string, any> = {};

  /**
   * Initialize the discovery service by loading all help sources
   */
  async initialize(): Promise<void> {
    if (this.isLoaded) return;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = this._loadAllSources();
    return this.loadPromise;
  }

  private async _loadAllSources(): Promise<void> {
    try {
      console.log('[HelpDiscovery] Loading all help sources...');

      // Load all sources in parallel
      const [
        tooltips,
        tours,
        articles,
        operations,
        masters,
        glossary,
        uiLocations,
        changelog,
        onboardingPaths
      ] = await Promise.all([
        this._loadTooltips(),
        this._loadTours(),
        this._loadArticles(),
        this._loadOperationsHelp(),
        this._loadMastersHelp(),
        this._loadGlossary(),
        this._loadUILocations(),
        this._loadChangelog(),
        this._loadOnboardingPaths()
      ]);

      // Aggregate all entries
      this.helpIndex = [
        ...tooltips,
        ...tours,
        ...articles,
        ...operations,
        ...masters,
        ...glossary
      ];

      this.uiLocations = uiLocations;
      this.changelog = changelog;
      this.onboardingPaths = onboardingPaths;

      // Build Fuse.js search index
      this.fuseInstance = new Fuse(this.helpIndex, {
        keys: [
          { name: 'title', weight: 10 },
          { name: 'description', weight: 5 },
          { name: 'tags', weight: 3 },
          { name: 'searchText', weight: 1 },
          { name: 'module', weight: 2 }
        ],
        threshold: 0.4,
        includeScore: true,
        ignoreLocation: true
      });

      this.isLoaded = true;
      console.log(`[HelpDiscovery] ✅ Loaded ${this.helpIndex.length} help entries`);
    } catch (error) {
      console.error('[HelpDiscovery] Failed to load help sources:', error);
      this.isLoaded = true; // Prevent retry loops
    }
  }

  private async _loadTooltips(): Promise<HelpEntry[]> {
    try {
      const response = await fetch('/help/ui-tooltips.json');
      if (!response.ok) return [];
      
      const data = await response.json();
      const entries: HelpEntry[] = [];

      Object.entries(data.modules).forEach(([moduleName, moduleData]: [string, any]) => {
        const types = ['buttons', 'fields', 'menu-items', 'cards', 'features'];
        
        types.forEach(type => {
          if (moduleData[type]) {
            moduleData[type].forEach((item: any) => {
              // Include module name in ID to ensure uniqueness across modules
              const uniqueId = `tooltip-${moduleName}-${item.id}`;
              entries.push({
                id: uniqueId,
                title: item.label || item.tooltip?.title || item.id,
                description: item.explanation || item.tooltip?.content || '',
                source: 'tooltip',
                module: moduleName,
                category: type.replace('-', ' '),
                roles: item.roles || ['all'],
                uiLocation: this._resolveUILocation(moduleName, item.id),
                isNew: this._isRecentlyUpdated(item.updatedAt),
                updatedAt: item.updatedAt || data.lastUpdated || new Date().toISOString(),
                tags: [type, moduleName, ...(item.tags || [])],
                searchText: `${item.label} ${item.explanation} ${item.tooltip?.content || ''}`,
                learnMoreUrl: item.tooltip?.learnMoreUrl
              });
            });
          }
        });
      });

      return entries;
    } catch {
      return [];
    }
  }

  private async _loadTours(): Promise<HelpEntry[]> {
    try {
      const response = await fetch('/help/tours.json');
      if (!response.ok) return [];
      
      const data = await response.json();
      const entries: HelpEntry[] = [];

      (data.tours || []).forEach((tour: any) => {
        entries.push({
          id: `tour-${tour.id}`,
          title: tour.title,
          description: tour.description,
          source: 'tour',
          module: tour.module || 'general',
          category: 'guided tour',
          roles: tour.roles || ['all'],
          uiLocation: { path: tour.startPath || '/' },
          isNew: this._isRecentlyUpdated(tour.updatedAt),
          updatedAt: tour.updatedAt || new Date().toISOString(),
          tags: ['tour', 'interactive', tour.module || 'general', ...(tour.tags || [])],
          searchText: `${tour.title} ${tour.description} ${tour.steps?.map((s: any) => s.title).join(' ') || ''}`
        });
      });

      return entries;
    } catch {
      return [];
    }
  }

  private async _loadArticles(): Promise<HelpEntry[]> {
    try {
      const response = await fetch('/help/content.json');
      if (!response.ok) return [];
      
      const articles = await response.json();
      return articles.map((article: any) => ({
        id: `article-${article.id}`,
        title: article.title,
        description: article.description,
        source: 'article' as const,
        module: article.category || 'general',
        category: article.category,
        roles: article.roles || ['all'],
        uiLocation: { path: `/help/articles/${article.slug || article.id}` },
        isNew: this._isRecentlyUpdated(article.lastUpdated),
        updatedAt: article.lastUpdated || new Date().toISOString(),
        tags: article.tags || [],
        searchText: `${article.title} ${article.description} ${article.content || ''}`,
        content: article.content
      }));
    } catch {
      return [];
    }
  }

  private async _loadOperationsHelp(): Promise<HelpEntry[]> {
    // All 13 operations files
    const modules = [
      'access-roles-ops',
      'ai-assistant-ops',
      'case-management-ops',
      'clients-ops',
      'communications-ops',
      'data-io-ops',
      'documents-ops',
      'hearings-ops',
      'masters-ops',
      'reports-ops',
      'settings-ops',
      'tasks-ops',
      'timeline-ops'
    ];

    const entries: HelpEntry[] = [];

    await Promise.all(modules.map(async (moduleFile) => {
      try {
        const response = await fetch(`/help/operations/${moduleFile}.json`);
        if (!response.ok) return;
        
        const data = await response.json();
        entries.push({
          id: `ops-${data.moduleId}`,
          title: data.title,
          description: data.purpose,
          source: 'operations',
          module: data.moduleId,
          category: 'operations',
          roles: ['all'],
          uiLocation: this._resolveUILocation(data.moduleId),
          isNew: this._isRecentlyUpdated(data.updatedAt),
          updatedAt: data.updatedAt || new Date().toISOString(),
          tags: ['operations', data.moduleId, ...(data.tags || [])],
          searchText: `${data.title} ${data.purpose} ${JSON.stringify(data.tabs || [])} ${JSON.stringify(data.commonWorkflows || [])}`
        });

        // Add individual tabs as entries
        (data.tabs || []).forEach((tab: any) => {
          entries.push({
            id: `ops-${data.moduleId}-${tab.id}`,
            title: `${data.title}: ${tab.name}`,
            description: tab.purpose,
            source: 'operations',
            module: data.moduleId,
            category: 'tab help',
            roles: ['all'],
            uiLocation: { path: this._getModulePath(data.moduleId), tab: tab.id },
            updatedAt: data.updatedAt || new Date().toISOString(),
            tags: ['tab', data.moduleId, tab.id],
            searchText: `${tab.name} ${tab.purpose} ${tab.keyActions?.join(' ') || ''}`
          });
        });
      } catch { /* Skip failed modules */ }
    }));

    return entries;
  }

  private async _loadMastersHelp(): Promise<HelpEntry[]> {
    const modules = [
      'authority-levels',
      'legal-authorities',
      'judges',
      'contacts',
      'employees',
      'statutory-deadlines'
    ];

    const entries: HelpEntry[] = [];

    await Promise.all(modules.map(async (moduleFile) => {
      try {
        const response = await fetch(`/help/masters/${moduleFile}.json`);
        if (!response.ok) return;
        
        const data = await response.json();
        entries.push({
          id: `master-${data.moduleId || moduleFile}`,
          title: data.title,
          description: data.purpose || data.overview,
          source: 'masters',
          module: data.moduleId || moduleFile,
          category: 'master data',
          roles: data.roles || ['Admin', 'Partner'],
          uiLocation: { path: `/masters/${moduleFile}` },
          updatedAt: data.updatedAt || new Date().toISOString(),
          tags: ['master data', 'configuration', moduleFile],
          searchText: `${data.title} ${data.purpose || data.overview} ${JSON.stringify(data.fields || [])}`
        });
      } catch { /* Skip failed modules */ }
    }));

    return entries;
  }

  private async _loadGlossary(): Promise<HelpEntry[]> {
    try {
      const response = await fetch('/help/glossary.json');
      if (!response.ok) return [];
      
      const data = await response.json();
      return (data.terms || []).map((term: any) => ({
        id: `glossary-${term.id || term.term.toLowerCase().replace(/\s+/g, '-')}`,
        title: term.term,
        description: term.definition,
        source: 'glossary' as const,
        module: term.category || 'general',
        category: 'glossary',
        roles: ['all'],
        updatedAt: term.updatedAt || new Date().toISOString(),
        tags: ['glossary', 'definition', term.category || 'legal'],
        searchText: `${term.term} ${term.definition} ${term.synonyms?.join(' ') || ''}`
      }));
    } catch {
      return [];
    }
  }

  private async _loadUILocations(): Promise<Record<string, any>> {
    try {
      const response = await fetch('/help/ui-locations.json');
      if (!response.ok) return {};
      return await response.json();
    } catch {
      return {};
    }
  }

  private async _loadChangelog(): Promise<ChangelogEntry[]> {
    try {
      const response = await fetch('/help/changelog.json');
      if (!response.ok) return [];
      const data = await response.json();
      return data.entries || [];
    } catch {
      return [];
    }
  }

  private async _loadOnboardingPaths(): Promise<Record<string, any>> {
    try {
      const response = await fetch('/help/onboarding-paths.json');
      if (!response.ok) return {};
      return await response.json();
    } catch {
      return {};
    }
  }

  private _resolveUILocation(module: string, elementId?: string): { path: string; element?: string } | undefined {
    const moduleLocations: Record<string, string> = {
      'case-management': '/cases',
      'cases': '/cases',
      'hearings': '/hearings/calendar', // Fixed: use canonical hearings route
      'tasks': '/tasks',
      'task-automation': '/tasks?tab=automation',
      'documents': '/documents',
      'document-management': '/documents',
      'dashboard': '/',
      'clients': '/clients',
      'employees': '/employees',
      'courts': '/courts',
      'judges': '/judges',
      'settings': '/settings',
      'access-roles': '/access-roles', // Fixed: was /settings/access-roles which doesn't exist
      'communications': '/communications',
      'reports': '/reports',
      'template_builder_2_0': '/documents?tab=templates&openTemplateBuilder=1',
      'template-builder': '/documents?tab=templates&openTemplateBuilder=1',
      'timeline': '/cases',
      'ai-assistant': '/ai-assistant',
      'client-portal': '/portal',
      'masters': '/courts',
      'data-io': '/help' // No dedicated data-io route yet
    };

    const path = moduleLocations[module];
    if (!path) return undefined;

    return { path, element: elementId };
  }

  private _getModulePath(moduleId: string): string {
    const paths: Record<string, string> = {
      'case-management': '/cases',
      'hearings': '/hearings',
      'tasks': '/tasks',
      'documents': '/documents',
      'timeline': '/cases',
      'ai-assistant': '/ai-assistant',
      'communications': '/communications'
    };
    return paths[moduleId] || '/';
  }

  private _isRecentlyUpdated(dateStr?: string): boolean {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return date > thirtyDaysAgo;
  }

  /**
   * Search across all help sources
   */
  async search(query: string, filters?: FilterOptions): Promise<HelpEntry[]> {
    await this.initialize();

    if (!query.trim() && !filters) {
      return this.helpIndex.slice(0, 50);
    }

    let results = this.helpIndex;

    // Apply text search
    if (query.trim() && this.fuseInstance) {
      const fuseResults = this.fuseInstance.search(query);
      results = fuseResults.map(r => r.item);
    }

    // Apply filters
    if (filters) {
      if (filters.source?.length) {
        results = results.filter(e => filters.source!.includes(e.source));
      }
      if (filters.module?.length) {
        results = results.filter(e => filters.module!.includes(e.module));
      }
      if (filters.roles?.length) {
        results = results.filter(e => 
          e.roles.includes('all') || 
          filters.roles!.some(r => e.roles.includes(r))
        );
      }
      if (filters.category?.length) {
        results = results.filter(e => filters.category!.includes(e.category));
      }
      if (filters.isNew) {
        results = results.filter(e => e.isNew);
      }
      if (filters.updatedSince) {
        results = results.filter(e => new Date(e.updatedAt) > filters.updatedSince!);
      }
    }

    return results;
  }

  /**
   * Get help entries for a specific module
   */
  async getModuleHelp(moduleId: string): Promise<HelpEntry[]> {
    await this.initialize();
    return this.helpIndex.filter(e => e.module === moduleId);
  }

  /**
   * Get all available modules
   */
  async getModules(): Promise<{ id: string; name: string; count: number }[]> {
    await this.initialize();
    
    const moduleCounts = new Map<string, number>();
    this.helpIndex.forEach(entry => {
      const count = moduleCounts.get(entry.module) || 0;
      moduleCounts.set(entry.module, count + 1);
    });

    return Array.from(moduleCounts.entries())
      .map(([id, count]) => ({
        id,
        name: id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        count
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Get new/updated features (What's New)
   */
  async getWhatsNew(options?: { days?: number; roles?: string[] }): Promise<ChangelogEntry[]> {
    await this.initialize();
    
    const days = options?.days || 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    let entries = this.changelog.filter(e => new Date(e.releaseDate) > cutoffDate);

    if (options?.roles?.length) {
      entries = entries.filter(e => 
        e.roles.includes('all') || 
        options.roles!.some(r => e.roles.includes(r))
      );
    }

    return entries.sort((a, b) => 
      new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()
    );
  }

  /**
   * Get onboarding path for a specific role
   */
  async getOnboardingPath(role: string, completedSteps: string[] = []): Promise<OnboardingPath | null> {
    await this.initialize();

    const rolePath = this.onboardingPaths[role.toLowerCase()];
    if (!rolePath) return null;

    // Resolve inherited steps
    let steps: OnboardingStep[] = [];
    if (rolePath.inherit) {
      const parentPath = await this.getOnboardingPath(rolePath.inherit, completedSteps);
      if (parentPath) {
        steps = [...parentPath.steps];
      }
    }

    // Add role-specific steps
    (rolePath.steps || []).forEach((step: any) => {
      steps.push({
        id: step.id,
        type: step.type,
        title: step.title,
        description: step.description || '',
        required: step.required !== false,
        estimatedMinutes: step.estimatedMinutes || 5,
        completed: completedSteps.includes(step.id)
      });
    });

    return {
      roleId: role.toLowerCase(),
      title: rolePath.title,
      description: rolePath.description || '',
      duration: rolePath.duration,
      steps,
      completedSteps: steps.filter(s => s.completed).length,
      totalSteps: steps.length
    };
  }

  /**
   * Get entry counts by source type
   */
  async getSourceCounts(): Promise<Record<string, number>> {
    await this.initialize();
    
    const counts: Record<string, number> = {};
    this.helpIndex.forEach(entry => {
      counts[entry.source] = (counts[entry.source] || 0) + 1;
    });
    return counts;
  }

  /**
   * Get total entry count
   */
  async getTotalCount(): Promise<number> {
    await this.initialize();
    return this.helpIndex.length;
  }

  /**
   * Get UI location for navigation
   */
  getUILocation(moduleId: string, tabId?: string): { path: string; tab?: string } | null {
    const location = this.uiLocations[moduleId];
    if (!location) {
      return this._resolveUILocation(moduleId) || null;
    }

    if (tabId && location.tabs?.[tabId]) {
      return location.tabs[tabId];
    }

    return { path: location.path, tab: tabId };
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.isLoaded;
  }
}

export const helpDiscoveryService = new HelpDiscoveryService();

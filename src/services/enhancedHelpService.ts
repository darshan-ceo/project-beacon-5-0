import { helpService } from './helpService';

interface ContextualHelpContent {
  overview: string;
  keyFeatures: Array<{
    title: string;
    description: string;
    gstRelevance?: string;
  }>;
  quickStart: Array<{
    step: number;
    action: string;
    gstContext?: string;
  }>;
  philosophy: {
    title: string;
    description: string;
    principles: string[];
  };
  relatedTours: string[];
  relatedArticles: Array<{
    title: string;
    url: string;
  }>;
}

interface TabSpecificHelpContent {
  title: string;
  description: string;
  interactiveElements?: Array<{
    name: string;
    purpose: string;
    example?: string;
  }>;
  buttons?: Array<{
    name: string;
    purpose: string;
    gstExample?: string;
  }>;
  philosophy?: {
    title: string;
    description: string;
    principles: string[];
  } | string | null;
  examples: Array<{
    scenario: string;
    solution: string;
    benefit: string;
  }>;
}

class EnhancedHelpService {
  private cache = new Map<string, any>();
  private cacheTimestamps = new Map<string, number>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in dev mode

  private isCacheValid(cacheKey: string): boolean {
    const timestamp = this.cacheTimestamps.get(cacheKey);
    if (!timestamp) return false;
    return Date.now() - timestamp < this.CACHE_DURATION;
  }

  private setCacheWithTimestamp(cacheKey: string, content: any): void {
    this.cache.set(cacheKey, content);
    this.cacheTimestamps.set(cacheKey, Date.now());
  }

  async getContextualPageHelp(pageId: string, forceRefresh: boolean = false): Promise<ContextualHelpContent> {
    const cacheKey = `contextual-${pageId}`;
    
    if (!forceRefresh && this.cache.has(cacheKey) && this.isCacheValid(cacheKey)) {
      console.log(`Loading contextual help for ${pageId} from cache`);
      return this.cache.get(cacheKey);
    }

    try {
      console.log(`Fetching fresh contextual help for ${pageId}`);
      // Try the new standardized help structure first
      const response = await fetch(`/help/pages/${pageId}.json`);
      if (response.ok) {
        const content = await response.json();
        this.setCacheWithTimestamp(cacheKey, content);
        console.log(`Successfully loaded contextual help for ${pageId}`);
        return content;
      }
    } catch (error) {
      console.log(`No contextual help found for ${pageId}, using fallback`);
    }

    const fallbackContent = this.getFallbackContextualContent(pageId);
    this.setCacheWithTimestamp(cacheKey, fallbackContent);
    return fallbackContent;
  }

  async getTabSpecificHelp(pageId: string, tabId: string, forceRefresh: boolean = false): Promise<TabSpecificHelpContent | null> {
    const cacheKey = `tab-${pageId}-${tabId}`;
    
    if (!forceRefresh && this.cache.has(cacheKey) && this.isCacheValid(cacheKey)) {
      console.log(`Loading tab help for ${pageId}/${tabId} from cache`);
      return this.cache.get(cacheKey);
    }

    try {
      console.log(`[EnhancedHelpService] Fetching fresh tab help for ${pageId}/${tabId}`);
      
      // First try the standard tab-specific path
      let helpUrl = `/help/pages/${pageId}/${tabId}-tab.json`;
      console.log(`[EnhancedHelpService] Attempting to fetch: ${helpUrl}`);
      
      let response = await fetch(helpUrl, { 
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      console.log(`[EnhancedHelpService] Response status: ${response.status}`);
      
      if (!response.ok) {
        // Fallback: try without -tab suffix
        helpUrl = `/help/pages/${pageId}/${tabId}.json`;
        console.log(`[EnhancedHelpService] Fallback attempt: ${helpUrl}`);
        response = await fetch(helpUrl, { 
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });
        console.log(`[EnhancedHelpService] Fallback response status: ${response.status}`);
      }
      
      if (response.ok) {
        const content = await response.json();
        const normalizedContent = this.normalizeHelpContent(content);
        this.setCacheWithTimestamp(cacheKey, normalizedContent);
        console.log(`[EnhancedHelpService] Successfully loaded tab help for ${pageId}/${tabId}:`, normalizedContent.title);
        return normalizedContent;
      } else {
        console.warn(`[EnhancedHelpService] Failed to fetch tab help for ${pageId}/${tabId} - Both attempts failed`);
      }
    } catch (error) {
      console.error(`[EnhancedHelpService] Error fetching tab help for ${pageId}/${tabId}:`, error);
    }

    const fallbackContent = this.generateTabFallback(pageId, tabId);
    this.setCacheWithTimestamp(cacheKey, fallbackContent);
    console.log(`Using fallback content for ${pageId}/${tabId}`);
    return fallbackContent;
  }

  private getFallbackContextualContent(pageId: string): ContextualHelpContent {
    return {
      overview: "This page helps you manage tasks efficiently with automation and tracking.",
      keyFeatures: [
        {
          title: "Task Automation",
          description: "Automate repetitive tasks",
          gstRelevance: "Ensures GST compliance deadlines are tracked"
        }
      ],
      quickStart: [
        { step: 1, action: "Start with the basics", gstContext: "Begin with GST workflow setup" }
      ],
      philosophy: {
        title: "Workflow Philosophy",
        description: "Systematic approach to legal processes",
        principles: ["Automation reduces errors", "Tracking ensures compliance"]
      },
      relatedTours: [],
      relatedArticles: []
    };
  }

  private generateTabFallback(pageId: string, tabId: string): TabSpecificHelpContent {
    return {
      title: `${tabId.charAt(0).toUpperCase() + tabId.slice(1)} Help`,
      description: `Learn how to use the ${tabId} features effectively.`,
      interactiveElements: [
        {
          name: "Primary Action",
          purpose: "Main action for this tab",
          example: "Example: Create new GST-related item"
        }
      ],
      philosophy: {
        title: "Feature Philosophy",
        description: "This feature streamlines your workflow.",
        principles: ["Improved efficiency", "Better organization"]
      },
      examples: [
        {
          scenario: "Common scenario",
          solution: "Use this feature to handle it",
          benefit: "Improved efficiency"
        }
      ]
    };
  }

  private normalizeHelpContent(content: any): TabSpecificHelpContent {
    const normalized: TabSpecificHelpContent = {
      title: content.title || 'Help',
      description: content.description || '',
      interactiveElements: content.interactiveElements || content.buttons || [],
      examples: content.examples || []
    };

    // Handle philosophy field
    if (content.philosophy) {
      if (typeof content.philosophy === 'string') {
        normalized.philosophy = {
          title: "Philosophy",
          description: content.philosophy,
          principles: []
        };
      } else if (typeof content.philosophy === 'object') {
        normalized.philosophy = {
          title: String(content.philosophy.title || 'Philosophy'),
          description: String(content.philosophy.description || ''),
          principles: Array.isArray(content.philosophy.principles) 
            ? content.philosophy.principles.map(p => String(p))
            : []
        };
      }
    } else {
      normalized.philosophy = null;
    }

    return normalized;
  }

  async getAllModuleHelp(): Promise<{ [moduleId: string]: { [tabId: string]: TabSpecificHelpContent } }> {
    const moduleHelpContent: { [moduleId: string]: { [tabId: string]: TabSpecificHelpContent } } = {};
    
    // Define available modules and their tabs
    const moduleStructure = {
      'task-automation': [
        'board', 'automation', 'templates', 'collaboration', 
        'escalation', 'analytics', 'insights', 'ai-assistant'
      ],
      'case-management': [
        'overview', 'lifecycle'
      ],
      'document-management': [
        'overview', 'templates'
      ],
      'reports': [
        'case-reports', 'hearings', 'sla-compliance', 'tasks', 'client-summary', 'communications'
      ],
      'hearings': [
        'list', 'calendar'
      ],
      'dashboard': [
        'overview', 'analytics', 'reports'
      ]
    };

    // Fetch all tab-specific help content
    for (const [moduleId, tabs] of Object.entries(moduleStructure)) {
      moduleHelpContent[moduleId] = {};
      
      for (const tabId of tabs) {
        try {
          const content = await this.getTabSpecificHelp(moduleId, tabId, false);
          if (content) {
            moduleHelpContent[moduleId][tabId] = content;
          }
        } catch (error) {
          console.warn(`Failed to load help for ${moduleId}/${tabId}:`, error);
        }
      }
    }

    return moduleHelpContent;
  }

  async search(query: string, userRole: string = 'Users', options: any = {}) {
    // Delegate to original help service
    return await helpService.searchContent(query, userRole);
  }

  clearCache(): void {
    this.cache.clear();
    this.cacheTimestamps.clear();
    console.log('Help service cache cleared');
  }

  clearSpecificCache(pageId: string, tabId?: string): void {
    if (tabId) {
      const cacheKey = `tab-${pageId}-${tabId}`;
      this.cache.delete(cacheKey);
      this.cacheTimestamps.delete(cacheKey);
      console.log(`Cleared cache for ${pageId}/${tabId}`);
    } else {
      const contextualKey = `contextual-${pageId}`;
      this.cache.delete(contextualKey);
      this.cacheTimestamps.delete(contextualKey);
      console.log(`Cleared contextual cache for ${pageId}`);
    }
  }

  refreshContent(pageId: string, tabId?: string): Promise<any> {
    if (tabId) {
      return this.getTabSpecificHelp(pageId, tabId, true);
    } else {
      return this.getContextualPageHelp(pageId, true);
    }
  }
}

export const enhancedHelpService = new EnhancedHelpService();
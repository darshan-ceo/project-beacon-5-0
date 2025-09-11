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
  buttons: Array<{
    name: string;
    purpose: string;
    gstExample: string;
  }>;
  philosophy: string;
  examples: Array<{
    scenario: string;
    solution: string;
    benefit: string;
  }>;
}

class EnhancedHelpService {
  private cache = new Map<string, any>();

  async getContextualPageHelp(pageId: string): Promise<ContextualHelpContent> {
    const cacheKey = `contextual-${pageId}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const response = await fetch(`/help/pages/${pageId}/contextual.json`);
      if (response.ok) {
        const content = await response.json();
        this.cache.set(cacheKey, content);
        return content;
      }
    } catch (error) {
      console.log(`No contextual help found for ${pageId}, using fallback`);
    }

    const fallbackContent = this.getFallbackContextualContent(pageId);
    this.cache.set(cacheKey, fallbackContent);
    return fallbackContent;
  }

  async getTabSpecificHelp(pageId: string, tabId: string): Promise<TabSpecificHelpContent | null> {
    const cacheKey = `tab-${pageId}-${tabId}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const response = await fetch(`/help/pages/${pageId}/${tabId}-tab.json`);
      if (response.ok) {
        const content = await response.json();
        this.cache.set(cacheKey, content);
        return content;
      }
    } catch (error) {
      console.log(`No tab-specific help found for ${pageId}/${tabId}`);
    }

    const fallbackContent = this.generateTabFallback(pageId, tabId);
    this.cache.set(cacheKey, fallbackContent);
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
      buttons: [
        {
          name: "Primary Action",
          purpose: "Main action for this tab",
          gstExample: "Example: Create new GST-related item"
        }
      ],
      philosophy: "This feature streamlines your workflow.",
      examples: [
        {
          scenario: "Common scenario",
          solution: "Use this feature to handle it",
          benefit: "Improved efficiency"
        }
      ]
    };
  }

  async search(query: string, userRole: string = 'Users', options: any = {}) {
    // Delegate to original help service
    return await helpService.searchContent(query, userRole);
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const enhancedHelpService = new EnhancedHelpService();
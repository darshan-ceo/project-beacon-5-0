export interface HelpContent {
  id: string;
  title: string;
  description: string;
  category: 'faq' | 'tutorial' | 'guide' | 'case-study' | 'best-practice';
  roles: string[];
  content: string;
  tags: string[];
  lastUpdated: string;
}

export interface GlossaryTerm {
  term: string;
  definition: string;
  technicalNote?: string;
  relatedTerms?: string[];
  category: 'legal' | 'technical' | 'process' | 'compliance';
}

export interface Tour {
  id: string;
  title: string;
  description: string;
  module: string;
  steps: TourStep[];
  roles: string[];
}

export interface TourStep {
  target: string;
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: 'click' | 'hover' | 'none';
}

class HelpService {
  private contentCache = new Map<string, any>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private async fetchWithCache<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.contentCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    const data = await fetcher();
    this.contentCache.set(key, { data, timestamp: Date.now() });
    return data;
  }

  async getHelpContent(userRole: string): Promise<HelpContent[]> {
    return this.fetchWithCache(`help-content-${userRole}`, async () => {
      try {
        const response = await fetch('/help/content.json');
        if (!response.ok) {
          // Return fallback content if file doesn't exist
          return this.getFallbackContent(userRole);
        }
        const allContent: HelpContent[] = await response.json();
        
        // Filter content based on user role
        return allContent.filter(content => 
          content.roles.includes('all') || 
          content.roles.includes(userRole) ||
          (userRole === 'Admin' && content.roles.includes('admin'))
        );
      } catch (error) {
        console.warn('Failed to load help content, using fallback:', error);
        return this.getFallbackContent(userRole);
      }
    });
  }

  async getGlossaryTerms(): Promise<GlossaryTerm[]> {
    return this.fetchWithCache('glossary-terms', async () => {
      try {
        const response = await fetch('/help/glossary.json');
        if (!response.ok) {
          return this.getFallbackGlossary();
        }
        return await response.json();
      } catch (error) {
        console.warn('Failed to load glossary, using fallback:', error);
        return this.getFallbackGlossary();
      }
    });
  }

  async getGuidedTours(userRole: string, module?: string): Promise<Tour[]> {
    return this.fetchWithCache(`tours-${userRole}-${module || 'all'}`, async () => {
      try {
        const response = await fetch('/help/tours.json');
        if (!response.ok) {
          return this.getFallbackTours(userRole);
        }
        const allTours: Tour[] = await response.json();
        
        return allTours.filter(tour => 
          tour.roles.includes('all') || 
          tour.roles.includes(userRole)
        ).filter(tour => 
          !module || tour.module === module
        );
      } catch (error) {
        console.warn('Failed to load tours, using fallback:', error);
        return this.getFallbackTours(userRole);
      }
    });
  }

  async searchContent(query: string, userRole: string): Promise<HelpContent[]> {
    const content = await this.getHelpContent(userRole);
    const normalizedQuery = query.toLowerCase();
    
    return content.filter(item =>
      item.title.toLowerCase().includes(normalizedQuery) ||
      item.description.toLowerCase().includes(normalizedQuery) ||
      item.content.toLowerCase().includes(normalizedQuery) ||
      item.tags.some(tag => tag.toLowerCase().includes(normalizedQuery))
    ).sort((a, b) => {
      // Score based on relevance
      const aScore = this.calculateRelevanceScore(a, normalizedQuery);
      const bScore = this.calculateRelevanceScore(b, normalizedQuery);
      return bScore - aScore;
    });
  }

  private calculateRelevanceScore(content: HelpContent, query: string): number {
    let score = 0;
    
    if (content.title.toLowerCase().includes(query)) score += 10;
    if (content.description.toLowerCase().includes(query)) score += 5;
    if (content.content.toLowerCase().includes(query)) score += 3;
    content.tags.forEach(tag => {
      if (tag.toLowerCase().includes(query)) score += 2;
    });
    
    return score;
  }

  async getInlineHelp(module: string, context?: string): Promise<{ title: string; content: string; learnMoreUrl?: string } | null> {
    const cacheKey = `inline-help-${module}-${context || 'default'}`;
    
    return this.fetchWithCache(cacheKey, async () => {
      try {
        const response = await fetch(`/help/inline/${module}.json`);
        if (!response.ok) {
          throw new Error(`Failed to fetch inline help for ${module}`);
        }
        
        const data = await response.json();
        const key = context || `${module}-basics`;
        
        return data[key] || null;
      } catch (error) {
        console.warn(`Failed to fetch inline help for ${module}:`, error);
        return this.getFallbackInlineHelp(module, context);
      }
    });
  }

  async getPageHelp(pageId: string): Promise<any> {
    const cacheKey = `page-help-${pageId}`;
    
    return this.fetchWithCache(cacheKey, async () => {
      try {
        const response = await fetch(`/help/pages/${pageId}.json`);
        if (!response.ok) {
          throw new Error(`Failed to fetch page help for ${pageId}`);
        }
        
        return await response.json();
      } catch (error) {
        console.warn(`Failed to fetch page help for ${pageId}:`, error);
        return this.getFallbackPageHelp(pageId);
      }
    });
  }

  clearCache(): void {
    this.contentCache.clear();
  }

  getFallbackPageHelp(pageId: string): any {
    const fallbackContent: Record<string, any> = {
      'case-management': {
        title: 'Case Management',
        description: 'Manage your legal cases from creation to completion',
        overview: 'The Case Management module provides comprehensive tools for tracking cases, managing documents, and collaborating with your team.',
        keyFeatures: [
          { title: 'Case Lifecycle', description: 'Track cases through legal stages' },
          { title: 'Timeline View', description: 'Visual timeline of case events' },
          { title: 'SLA Tracking', description: 'Monitor compliance and deadlines' }
        ],
        quickStart: [
          { step: 1, title: 'Create New Case', description: 'Click New Case to start' },
          { step: 2, title: 'Fill Details', description: 'Add case information' },
          { step: 3, title: 'Set Stage', description: 'Choose legal stage' }
        ],
        commonTasks: [
          { title: 'Advance Stage', description: 'Move cases forward' },
          { title: 'Schedule Hearing', description: 'Book court dates' },
          { title: 'Upload Documents', description: 'Add case files' }
        ]
      },
      'dashboard': {
        title: 'Dashboard',
        description: 'Overview of your practice performance',
        overview: 'The Dashboard provides real-time metrics and quick access to common operations.',
        keyFeatures: [
          { title: 'Real-time Metrics', description: 'Live performance data' },
          { title: 'Quick Actions', description: 'Shortcuts to common tasks' },
          { title: 'Analytics', description: 'Practice insights and trends' }
        ],
        quickStart: [
          { step: 1, title: 'Review Metrics', description: 'Check key indicators' },
          { step: 2, title: 'Use Quick Actions', description: 'Access common features' },
          { step: 3, title: 'Analyze Trends', description: 'Review performance data' }
        ],
        commonTasks: [
          { title: 'Create Case', description: 'Start new legal case' },
          { title: 'Schedule Hearing', description: 'Book court hearing' },
          { title: 'Generate Reports', description: 'Create practice reports' }
        ]
      }
    };
    
    return fallbackContent[pageId] || fallbackContent['dashboard'];
  }

  private getFallbackContent(userRole: string): HelpContent[] {
    const baseContent: HelpContent[] = [
      {
        id: 'getting-started',
        title: 'Getting Started Guide',
        description: 'Learn the basics of using the Legal Case Management System',
        category: 'guide',
        roles: ['all'],
        content: `# Getting Started

Welcome to the Legal Case Management System! This guide will help you understand the core features and workflows.

## Key Features:
- **Case Management**: Create, track, and manage legal cases
- **Document Management**: Upload, organize, and share documents
- **Hearing Calendar**: Schedule and track court hearings
- **Task Management**: Assign and monitor case-related tasks
- **Reporting**: Generate comprehensive case reports

## First Steps:
1. Complete your profile setup
2. Explore the dashboard
3. Create your first case
4. Upload relevant documents
5. Schedule upcoming hearings

For detailed walkthroughs, use the guided tours available in each module.`,
        tags: ['onboarding', 'basics', 'introduction'],
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'case-creation',
        title: 'Creating Your First Case',
        description: 'Step-by-step guide to case creation and setup',
        category: 'tutorial',
        roles: ['all'],
        content: `# Creating Your First Case

Follow these steps to create a new case in the system:

## Step 1: Access Case Management
Navigate to the "Cases" section from the main menu.

## Step 2: Click "New Case"
Use the "+" button to open the case creation form.

## Step 3: Fill Required Information
- Case title and description
- Court and jurisdiction
- Client information
- Case type and priority

## Step 4: Add Initial Documents
Upload any relevant documents to get started.

## Step 5: Set Up Timeline
Add important dates and deadlines.

## Best Practices:
- Use descriptive case titles
- Add comprehensive case descriptions
- Tag cases for easy searching
- Set up reminders for key dates`,
        tags: ['case', 'creation', 'tutorial', 'workflow'],
        lastUpdated: new Date().toISOString()
      }
    ];

    if (userRole === 'Admin' || userRole === 'Partner/CA') {
      baseContent.push({
        id: 'admin-setup',
        title: 'Administrator Setup Guide',
        description: 'Configure system settings and user permissions',
        category: 'guide',
        roles: ['Admin'],
        content: `# Administrator Setup Guide

As an administrator, you have access to system-wide configuration options.

## User Management:
- Create and manage user accounts
- Assign roles and permissions
- Set up approval workflows

## System Configuration:
- Configure court integrations
- Set up notification preferences
- Customize form templates

## Compliance Setup:
- Configure SLA tracking
- Set up escalation rules
- Enable audit logging

## Integration Management:
- Calendar synchronization
- Document management system
- Email notifications

Regular maintenance tasks include user access reviews, system backups, and performance monitoring.`,
        tags: ['admin', 'setup', 'configuration', 'permissions'],
        lastUpdated: new Date().toISOString()
      });
    }

    return baseContent;
  }

  private getFallbackGlossary(): GlossaryTerm[] {
    return [
      {
        term: 'RAG',
        definition: 'Retrieval-Augmented Generation - AI technique that combines information retrieval with text generation',
        technicalNote: 'Used in the AI assistant to provide contextually relevant responses based on case documents',
        category: 'technical',
        relatedTerms: ['AI Assistant', 'Document Analysis']
      },
      {
        term: 'SLA',
        definition: 'Service Level Agreement - Commitment between service provider and client defining expected service standards',
        technicalNote: 'System tracks SLA compliance for case processing times and response deadlines',
        category: 'process',
        relatedTerms: ['Timeline', 'Escalation']
      },
      {
        term: 'DRC',
        definition: 'Dispute Resolution Council - Administrative body for resolving specific types of legal disputes',
        category: 'legal',
        relatedTerms: ['Court', 'Jurisdiction']
      },
      {
        term: 'ASMT',
        definition: 'Assessment - Process of evaluating case merits and determining appropriate legal strategy',
        category: 'legal',
        relatedTerms: ['Case Evaluation', 'Legal Strategy']
      },
      {
        term: 'RBAC',
        definition: 'Role-Based Access Control - Security model that restricts access based on user roles',
        technicalNote: 'System uses RBAC to control what features and data each user can access',
        category: 'technical',
        relatedTerms: ['Permissions', 'Security']
      },
      {
        term: 'GST',
        definition: 'Goods and Services Tax - Indirect tax levied on supply of goods and services',
        category: 'legal',
        relatedTerms: ['Tax Law', 'Compliance']
      }
    ];
  }

  private getFallbackTours(userRole: string): Tour[] {
    const baseTours: Tour[] = [
      {
        id: 'case-overview',
        title: 'Case Management Tour',
        description: 'Learn how to create and manage cases',
        module: 'cases',
        roles: ['all'],
        steps: [
          {
            target: '[data-tour="cases-nav"]',
            title: 'Navigate to Cases',
            content: 'Click here to access the case management section',
            position: 'bottom'
          },
          {
            target: '[data-tour="new-case-btn"]',
            title: 'Create New Case',
            content: 'Use this button to create a new case',
            position: 'left'
          },
          {
            target: '[data-tour="case-list"]',
            title: 'Case List',
            content: 'View and filter all your cases here',
            position: 'top'
          }
        ]
      },
      {
        id: 'document-upload',
        title: 'Document Management Tour',
        description: 'Learn to upload and organize documents',
        module: 'documents',
        roles: ['all'],
        steps: [
          {
            target: '[data-tour="documents-nav"]',
            title: 'Documents Section',
            content: 'Access document management from here',
            position: 'bottom'
          },
          {
            target: '[data-tour="upload-btn"]',
            title: 'Upload Documents',
            content: 'Click to upload new documents',
            position: 'left'
          },
          {
            target: '[data-tour="folder-structure"]',
            title: 'Organize with Folders',
            content: 'Use folders to organize your documents by case or type',
            position: 'right'
          }
        ]
      }
    ];

    return baseTours.filter(tour => 
      tour.roles.includes('all') || tour.roles.includes(userRole)
    );
  }

  private getFallbackInlineHelp(module: string, context?: string): { title: string; content: string; learnMoreUrl?: string } | null {
    const helpMap: Record<string, Record<string, any>> = {
      'client-master': {
        default: {
          title: 'Client Management',
          content: 'Add and manage client information including contact details, case history, and relationship data.',
          learnMoreUrl: '/help#client-management'
        }
      },
      'case-overview': {
        default: {
          title: 'Case Overview',
          content: 'Track case progress, manage deadlines, and coordinate with team members on case activities.',
          learnMoreUrl: '/help#case-management'
        }
      },
      'documents': {
        default: {
          title: 'Document Management',
          content: 'Upload, organize, and share case-related documents with proper version control and access permissions.',
          learnMoreUrl: '/help#document-management'
        }
      },
      'hearings': {
        default: {
          title: 'Hearing Management',
          content: 'Schedule court hearings, send notifications, and sync with external calendar systems.',
          learnMoreUrl: '/help#hearing-scheduling'
        }
      },
      'reports': {
        default: {
          title: 'Report Generation',
          content: 'Create comprehensive reports on case progress, billing, and performance metrics.',
          learnMoreUrl: '/help#reporting'
        }
      }
    };

    const moduleHelp = helpMap[module];
    if (!moduleHelp) return null;

    return moduleHelp[context || 'default'] || null;
  }
}

export const helpService = new HelpService();
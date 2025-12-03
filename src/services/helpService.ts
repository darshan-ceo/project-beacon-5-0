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
          console.warn(`Page help file not found for ${pageId}, using fallback`);
          return this.getFallbackPageHelp(pageId);
        }
        
        const data = await response.json();
        console.log(`Loaded page help for ${pageId}:`, data);
        return data;
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
      'task-automation': {
        title: 'Task Automation & Management',
        description: 'Automate repetitive tasks and reminders in Litigation GST CRM',
        overview: 'Automates repetitive tasks and reminders like creating tasks after a hearing, sending deadline alerts, or assigning follow-ups to the right user.',
        keyFeatures: [
          { title: 'Automation Rules', description: 'Create trigger-based rules for automatic task generation' },
          { title: 'Task Templates', description: 'Pre-configured task sets for common legal workflows' },
          { title: 'Escalation Matrix', description: 'Automatic escalation of overdue tasks to supervisors' },
          { title: 'AI Assistant', description: 'Intelligent task creation based on case context' }
        ],
        tabGuide: [
          { tab: 'Rules', description: 'Create/edit automation rules (trigger → conditions → action)', whenToUse: 'When setting up automated workflows' },
          { tab: 'Bundles', description: 'Pre-configured task sets for common workflows', whenToUse: 'For repetitive task sequences' },
          { tab: 'Logs', description: 'View automation execution history and troubleshooting', whenToUse: 'When debugging rules or checking execution status' },
          { tab: 'Templates', description: 'Save/reuse message and task templates', whenToUse: 'For standardizing communications and tasks' }
        ],
        buttonGuide: [
          { button: 'New Rule', description: 'Create a new automation rule', action: 'Opens rule builder wizard' },
          { button: 'Enable/Disable', description: 'Toggle rule active state', action: 'Activates or deactivates selected rule' },
          { button: 'Test Rule', description: 'Run rule on sample data', action: 'Preview rule outcome without affecting live data' },
          { button: 'View Logs', description: 'Check rule execution history', action: 'Opens detailed execution logs and error reports' }
        ],
        quickStart: [
          { step: 1, title: 'Go to Automation → Rules', description: 'Access the automation section' },
          { step: 2, title: 'Click "New Rule"', description: 'Start creating your first automation' },
          { step: 3, title: 'Select Trigger', description: 'Choose what event starts the automation' },
          { step: 4, title: 'Add Conditions', description: 'Set when the rule should execute' },
          { step: 5, title: 'Choose Actions', description: 'Define what should happen' },
          { step: 6, title: 'Test & Enable', description: 'Verify the rule works and activate it' }
        ],
        commonTasks: [
          { title: 'Create Auto-Task for Hearing', description: 'Automatically create tasks when hearings are updated' },
          { title: 'Send Client WhatsApp', description: 'Auto-send messages when documents are uploaded' },
          { title: 'Escalate Overdue Tasks', description: 'Notify supervisors when tasks exceed SLA' },
          { title: 'Use Task Templates', description: 'Create standardized task sets for common workflows' }
        ]
      },
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

  private getFallbackInlineHelp(module: string, context?: string): { title: string; content: string; learnMoreUrl?: string; quickTips?: string[]; relatedArticles?: { title: string; url: string }[] } | null {
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
      },
      'settings': {
        'general': {
          title: 'General Settings',
          content: 'Configure basic system parameters including file upload limits, caching, and performance optimization settings.',
          quickTips: ['Set appropriate file size limits based on storage capacity', 'Enable compression to reduce bandwidth', 'Adjust cache duration based on data change frequency'],
          relatedArticles: [{ title: 'Performance Optimization Guide', url: '#' }]
        },
        'security': {
          title: 'Security & Roles',
          content: 'Manage authentication settings, password policies, and access control rules to protect sensitive legal data.',
          quickTips: ['Enable 2FA for admin accounts', 'Set session timeout based on security requirements', 'Use IP whitelisting for sensitive environments'],
          relatedArticles: [{ title: 'Security Best Practices', url: '#' }]
        },
        'notifications': {
          title: 'Notification Settings',
          content: 'Configure email, SMS, and push notification preferences for case updates and deadline reminders.',
          quickTips: ['Test email configuration before going live', 'Set up templates for consistent messaging'],
          relatedArticles: [{ title: 'Email Configuration Guide', url: '#' }]
        },
        'legal': {
          title: 'Legal Configuration',
          content: 'Configure case management parameters including case number formats, financial year settings, and SLA rules.',
          quickTips: ['Use consistent case number formats', 'Set financial year based on jurisdiction'],
          relatedArticles: [{ title: 'Case Numbering Standards', url: '#' }]
        },
        'ai-communications': {
          title: 'AI & Communications',
          content: 'Configure AI assistant settings and communication templates for automated responses and document analysis.',
          quickTips: ['Review AI suggestions before sending to clients', 'Customize communication templates for your firm'],
          relatedArticles: [{ title: 'AI Features Overview', url: '#' }]
        },
        'integrations': {
          title: 'Integrations',
          content: 'Connect external services like Google Calendar and Microsoft Outlook for hearing and deadline synchronization.',
          quickTips: ['Use OAuth for secure calendar connections', 'Test sync functionality before enabling for all users'],
          relatedArticles: [{ title: 'Calendar Integration Setup', url: '#' }]
        },
        'address': {
          title: 'Address & Location',
          content: 'Configure address formats, state/city databases, and location settings for client and court addresses.',
          quickTips: ['Keep state and city lists updated', 'Use standardized address formats'],
          relatedArticles: [{ title: 'Address Configuration', url: '#' }]
        },
        'templates': {
          title: 'Templates & Outcomes',
          content: 'Manage document templates and outcome configurations for standardized reporting.',
          quickTips: ['Create templates for common document types', 'Define outcome categories for better reporting'],
          relatedArticles: [{ title: 'Template Management', url: '#' }]
        },
        'legal-hierarchy': {
          title: 'Legal Hierarchy',
          content: 'Define the hierarchical structure of legal authorities (Assessment → Adjudication → Tribunal → High Court → Supreme Court) and their sub-categories (matter types).',
          quickTips: ['Follow standard legal hierarchy structure', 'Add matter types for authorities with sub-categories', 'Deactivating a level hides it from forms but preserves data'],
          relatedArticles: [{ title: 'Legal Authority Structure', url: '#' }, { title: 'Case Filing Guide', url: '#' }]
        },
        'sample-data': {
          title: 'Sample Data',
          content: 'Generate sample data for testing and demonstration purposes. Use only in development or training environments.',
          quickTips: ['Never use sample data in production', 'Clear sample data before going live'],
          relatedArticles: [{ title: 'Testing Guide', url: '#' }]
        },
        'default': {
          title: 'System Settings',
          content: 'Configure system-wide settings and parameters for your legal practice management system.',
          quickTips: ['Review settings regularly', 'Test changes in a safe environment first'],
          relatedArticles: [{ title: 'System Administration Guide', url: '#' }]
        }
      }
    };

    const moduleHelp = helpMap[module];
    if (!moduleHelp) return null;

    return moduleHelp[context || 'default'] || moduleHelp['default'] || null;
  }
}

export const helpService = new HelpService();
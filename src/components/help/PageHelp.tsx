import React, { useState, useEffect } from 'react';
import { HelpCircle, X, ChevronDown, ChevronUp, ExternalLink, Play, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { helpService } from '@/services/helpService';

import { cn } from '@/lib/utils';

interface PageHelpProps {
  pageId: string;
  className?: string;
  variant?: 'drawer' | 'inline' | 'floating';
}

interface PageHelpContent {
  title: string;
  description: string;
  overview?: string;
  keyFeatures?: Array<{
    title: string;
    description: string;
    icon?: string;
  }>;
  quickStart?: Array<{
    step: number;
    title: string;
    description: string;
  }>;
  commonTasks?: Array<{
    title: string;
    description: string;
    action?: string;
  }>;
  relatedTours?: Array<{
    id: string;
    title: string;
    description: string;
  }>;
  relatedArticles?: Array<{
    title: string;
    url: string;
  }>;
  whatsNew?: Array<{
    title: string;
    description: string;
    date: string;
    badge?: string;
  }>;
  // New structure support
  tabGuide?: Array<{
    tab: string;
    description: string;
    whenToUse: string;
  }>;
  buttonGuide?: Array<{
    button: string;
    description: string;
    action: string;
  }>;
}

export const PageHelp: React.FC<PageHelpProps> = ({
  pageId,
  className,
  variant = 'drawer'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState<PageHelpContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overview: true,
    features: false,
    tabGuide: false,
    buttonGuide: false,
    quickStart: false,
    tasks: false,
    tours: false,
    whatsNew: false
  });

  const renderHelpContent = () => {
    if (loading) {
      return <div className="text-center py-8 text-muted-foreground">Loading help content...</div>;
    }

    if (!content) {
      return <div className="text-center py-8 text-muted-foreground">No help content available</div>;
    }

    return (
      <div className="space-y-4">
        {/* Overview */}
        {content.overview && (
          <>
            <Collapsible open={expandedSections.overview} onOpenChange={() => toggleSection('overview')}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                  <span className="font-medium">Overview</span>
                  {expandedSections.overview ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 text-sm text-muted-foreground">
                {content.overview}
              </CollapsibleContent>
            </Collapsible>
            <Separator />
          </>
        )}

        {/* Key Features */}
        {content.keyFeatures && content.keyFeatures.length > 0 && (
          <>
            <Collapsible open={expandedSections.features} onOpenChange={() => toggleSection('features')}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                  <span className="font-medium">Key Features</span>
                  {expandedSections.features ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2">
                {content.keyFeatures.map((feature, index) => (
                  <div key={index} className="text-sm">
                    <div className="font-medium">{feature.title}</div>
                    <div className="text-muted-foreground">{feature.description}</div>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
            <Separator />
          </>
        )}

        {/* Tab Guide */}
        {content.tabGuide && content.tabGuide.length > 0 && (
          <>
            <Collapsible open={expandedSections.tabGuide} onOpenChange={() => toggleSection('tabGuide')}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                  <span className="font-medium">Tab Guide</span>
                  {expandedSections.tabGuide ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2">
                {content.tabGuide.map((tab, index) => (
                  <div key={index} className="text-sm border rounded p-2">
                    <div className="font-medium">{tab.tab}</div>
                    <div className="text-muted-foreground mb-1">{tab.description}</div>
                    <div className="text-xs text-primary font-medium">When to use: {tab.whenToUse}</div>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
            <Separator />
          </>
        )}

        {/* Button Guide */}
        {content.buttonGuide && content.buttonGuide.length > 0 && (
          <>
            <Collapsible open={expandedSections.buttonGuide} onOpenChange={() => toggleSection('buttonGuide')}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                  <span className="font-medium">Button Guide</span>
                  {expandedSections.buttonGuide ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2">
                {content.buttonGuide.map((button, index) => (
                  <div key={index} className="text-sm border rounded p-2">
                    <div className="font-medium">{button.button}</div>
                    <div className="text-muted-foreground mb-1">{button.description}</div>
                    <div className="text-xs text-primary font-medium">Action: {button.action}</div>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
            <Separator />
          </>
        )}

        {/* Quick Start */}
        {content.quickStart && content.quickStart.length > 0 && (
          <>
            <Collapsible open={expandedSections.quickStart} onOpenChange={() => toggleSection('quickStart')}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                  <span className="font-medium">Quick Start</span>
                  {expandedSections.quickStart ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2">
                {content.quickStart.map((step, index) => (
                  <div key={index} className="flex gap-3 text-sm">
                    <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                      {step.step}
                    </Badge>
                    <div>
                      <div className="font-medium">{step.title}</div>
                      <div className="text-muted-foreground">{step.description}</div>
                    </div>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
            <Separator />
          </>
        )}

        {/* Common Tasks */}
        {content.commonTasks && content.commonTasks.length > 0 && (
          <>
            <Collapsible open={expandedSections.tasks} onOpenChange={() => toggleSection('tasks')}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                  <span className="font-medium">Common Tasks</span>
                  {expandedSections.tasks ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2">
                {content.commonTasks.map((task, index) => (
                  <div key={index} className="text-sm border rounded p-2">
                    <div className="font-medium">{task.title}</div>
                    <div className="text-muted-foreground">{task.description}</div>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
            <Separator />
          </>
        )}

        {/* Guided Tours */}
        {content.relatedTours && content.relatedTours.length > 0 && (
          <>
            <Separator />
            <Collapsible open={expandedSections.tours} onOpenChange={() => toggleSection('tours')}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                  <span className="font-medium">Guided Tours</span>
                  {expandedSections.tours ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2">
                {content.relatedTours.map((tour, index) => (
                  <div key={index} className="flex items-center justify-between text-sm border rounded p-2">
                    <div>
                      <div className="font-medium">{tour.title}</div>
                      <div className="text-muted-foreground">{tour.description}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startTour(tour.id)}
                    >
                      <Play className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          </>
        )}

        {/* What's New */}
        {content.whatsNew && content.whatsNew.length > 0 && (
          <>
            <Separator />
            <Collapsible open={expandedSections.whatsNew} onOpenChange={() => toggleSection('whatsNew')}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                  <span className="font-medium">What's New</span>
                  {expandedSections.whatsNew ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2">
                {content.whatsNew.map((item, index) => (
                  <div key={index} className="text-sm border rounded p-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-medium">{item.title}</div>
                      {item.badge && <Badge variant="secondary" className="text-xs">{item.badge}</Badge>}
                    </div>
                    <div className="text-muted-foreground">{item.description}</div>
                    <div className="text-xs text-muted-foreground mt-1">{item.date}</div>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          </>
        )}
      </div>
    );
  };

  useEffect(() => {
    if (isOpen && !content) {
      fetchPageHelp();
    }
  }, [isOpen, pageId]);

  const fetchPageHelp = async () => {
    setLoading(true);
    try {
      const helpContent = await helpService.getPageHelp(pageId);
      setContent(helpContent);
    } catch (error) {
      console.error('Failed to fetch page help:', error);
      setContent(getFallbackContent(pageId));
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const startTour = async (tourId: string) => {
    // Tour service removed - tours are no longer supported
    console.log('Tours feature has been disabled');
    setIsOpen(false);
  };

  const getFallbackContent = (pageId: string): PageHelpContent => {
    const fallbackContent: Record<string, PageHelpContent> = {
      'case-management': {
        title: 'Case Management',
        description: 'Manage your legal cases from creation to completion',
        overview: 'The Case Management module provides a comprehensive view of all your legal cases, allowing you to track progress, manage documents, schedule hearings, and collaborate with your team.',
        keyFeatures: [
          { title: 'Case Lifecycle', description: 'Track cases through various legal stages' },
          { title: 'Timeline View', description: 'Visual timeline of case events and milestones' },
          { title: 'SLA Tracking', description: 'Monitor compliance deadlines and requirements' },
          { title: 'Team Collaboration', description: 'Assign tasks and communicate with team members' }
        ],
        quickStart: [
          { step: 1, title: 'Create New Case', description: 'Click the "New Case" button to start' },
          { step: 2, title: 'Fill Details', description: 'Add case information and client details' },
          { step: 3, title: 'Set Stage', description: 'Choose the appropriate legal stage' },
          { step: 4, title: 'Save & Continue', description: 'Save the case and begin working' }
        ],
        commonTasks: [
          { title: 'Advance Case Stage', description: 'Move cases to the next legal stage', action: 'advance-stage' },
          { title: 'Schedule Hearing', description: 'Set up court hearing dates', action: 'schedule-hearing' },
          { title: 'Upload Documents', description: 'Add case-related documents', action: 'upload-docs' },
          { title: 'Assign Tasks', description: 'Create tasks for team members', action: 'create-task' }
        ]
      },
      'document-management': {
        title: 'Document Management',
        description: 'Organize, store, and manage all your legal documents',
        overview: 'The Document Management System (DMS) provides secure storage and organization for all your legal documents with version control, access permissions, and collaborative features.',
        keyFeatures: [
          { title: 'Secure Storage', description: 'Encrypted document storage with access controls' },
          { title: 'Version Control', description: 'Track document versions and changes' },
          { title: 'Template Library', description: 'Pre-built legal document templates' },
          { title: 'Collaboration', description: 'Share and collaborate on documents' }
        ],
        quickStart: [
          { step: 1, title: 'Upload Document', description: 'Drag and drop or browse to upload files' },
          { step: 2, title: 'Organize', description: 'Create folders and tag documents' },
          { step: 3, title: 'Set Permissions', description: 'Control who can access documents' },
          { step: 4, title: 'Share', description: 'Share with clients or team members' }
        ],
        commonTasks: [
          { title: 'Create Folder', description: 'Organize documents into folders', action: 'create-folder' },
          { title: 'Upload Files', description: 'Add new documents to the system', action: 'upload-files' },
          { title: 'Generate from Template', description: 'Create documents from templates', action: 'use-template' },
          { title: 'Share with Client', description: 'Provide client access to documents', action: 'share-docs' }
        ]
      },
      'dashboard': {
        title: 'Dashboard',
        description: 'Overview of your practice performance and key metrics',
        overview: 'The Dashboard provides a comprehensive overview of your practice with real-time metrics, pending tasks, upcoming deadlines, and performance analytics.',
        keyFeatures: [
          { title: 'Real-time Metrics', description: 'Live updates on case status and performance' },
          { title: 'Task Management', description: 'Quick access to pending tasks and deadlines' },
          { title: 'Analytics', description: 'Practice performance insights and trends' },
          { title: 'Quick Actions', description: 'Shortcuts to common operations' }
        ],
        quickStart: [
          { step: 1, title: 'Review Metrics', description: 'Check key performance indicators' },
          { step: 2, title: 'Check Tasks', description: 'Review pending tasks and deadlines' },
          { step: 3, title: 'Take Action', description: 'Use quick actions for common tasks' },
          { step: 4, title: 'Analyze Trends', description: 'Review performance analytics' }
        ],
        commonTasks: [
          { title: 'Create New Case', description: 'Start a new legal case', action: 'new-case' },
          { title: 'Schedule Hearing', description: 'Book a court hearing', action: 'new-hearing' },
          { title: 'View Reports', description: 'Access detailed reports', action: 'view-reports' },
          { title: 'Manage Tasks', description: 'Handle pending tasks', action: 'manage-tasks' }
        ]
      }
    };
    
    return fallbackContent[pageId] || fallbackContent['dashboard'];
  };

  if (variant === 'floating' && !isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        className={cn("fixed bottom-4 right-4 z-50 shadow-lg", className)}
        onClick={() => setIsOpen(true)}
      >
        <BookOpen className="h-4 w-4 mr-2" />
        Page Help
      </Button>
    );
  }

  if (variant === 'inline') {
    return (
      <Card className={cn("w-full max-w-md", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Page Help</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        {isOpen && (
          <CardContent>
            {renderHelpContent()}
          </CardContent>
        )}
      </Card>
    );
  }

  // Drawer variant (default)
  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        className={cn("flex items-center gap-2", className)}
        onClick={() => setIsOpen(true)}
        data-tour="page-help-button"
      >
        <BookOpen className="h-4 w-4" />
        Page Help
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={() => setIsOpen(false)}
      />
      
      {/* Drawer */}
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-background border-l shadow-lg">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">{content?.title || 'Page Help'}</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {content?.description && (
              <p className="text-muted-foreground mb-4">{content.description}</p>
            )}
            {renderHelpContent()}
          </div>
        </div>
      </div>
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { HelpCircle, BookOpen, Lightbulb, Target, AlertCircle } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { enhancedHelpService } from '@/services/enhancedHelpService';
import { tourService } from '@/services/tourService';
import { cn } from '@/lib/utils';

interface ContextualPageHelpProps {
  pageId: string;
  activeTab?: string;
  activeContext?: string;
  className?: string;
  variant?: 'floating' | 'inline' | 'drawer';
}

interface ContextualHelpContent {
  overview: string;
  keyFeatures: Array<{
    title: string;
    description: string;
    gstRelevance?: string;
  }>;
  tabSpecificHelp?: {
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
  };
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

export const ContextualPageHelp: React.FC<ContextualPageHelpProps> = ({
  pageId,
  activeTab,
  activeContext,
  className,
  variant = 'floating'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState<ContextualHelpContent | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadHelpContent();
    }
  }, [isOpen, pageId, activeTab, activeContext]);

  const loadHelpContent = async () => {
    setLoading(true);
    try {
      const baseContent = await enhancedHelpService.getContextualPageHelp(pageId);
      const tabContent = activeTab ? await enhancedHelpService.getTabSpecificHelp(pageId, activeTab) : null;
      
      setContent({
        ...baseContent,
        tabSpecificHelp: tabContent
      });
    } catch (error) {
      console.error('Failed to load help content:', error);
      setContent(getFallbackContent());
    } finally {
      setLoading(false);
    }
  };

  const getFallbackContent = (): ContextualHelpContent => {
    return {
      overview: "This page helps you manage and automate tasks efficiently.",
      keyFeatures: [
        {
          title: "Task Management",
          description: "Create and track tasks with deadlines",
          gstRelevance: "Ensures GST compliance deadlines are never missed"
        }
      ],
      quickStart: [
        { step: 1, action: "Click on the relevant tab to begin", gstContext: "Start with automation for GST workflows" }
      ],
      philosophy: {
        title: "Workflow Philosophy",
        description: "Designed to streamline legal processes",
        principles: ["Automation reduces manual errors", "SLA tracking ensures compliance"]
      },
      relatedTours: [],
      relatedArticles: []
    };
  };

  const handleStartTour = (tourId: string) => {
    setIsOpen(false);
    tourService.startTour(tourId);
  };

  const renderTabSpecificHelp = () => {
    if (!content?.tabSpecificHelp) return null;

    const { tabSpecificHelp } = content;

    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            {activeTab} Tab Help
          </CardTitle>
          <CardDescription>{tabSpecificHelp.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Buttons Guide */}
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Button Actions
            </h4>
            <div className="space-y-2">
              {tabSpecificHelp.buttons.map((button, index) => (
                <div key={index} className="p-3 bg-muted/50 rounded-lg">
                  <div className="font-medium">{button.name}</div>
                  <div className="text-sm text-muted-foreground">{button.purpose}</div>
                  <div className="text-xs text-primary mt-1">
                    <strong>GST Example:</strong> {button.gstExample}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Philosophy */}
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Why This Matters
            </h4>
            <p className="text-sm text-muted-foreground">{tabSpecificHelp.philosophy}</p>
          </div>

          {/* Examples */}
          <div>
            <h4 className="font-semibold mb-2">GST Use Cases</h4>
            <div className="space-y-2">
              {tabSpecificHelp.examples.map((example, index) => (
                <Collapsible key={index}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-muted/30 rounded text-left text-sm hover:bg-muted/50">
                    <span className="font-medium">{example.scenario}</span>
                    <Badge variant="outline" className="text-xs">Example {index + 1}</Badge>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="p-3 text-sm space-y-1">
                    <div><strong>Solution:</strong> {example.solution}</div>
                    <div className="text-primary"><strong>Benefit:</strong> {example.benefit}</div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderHelpContent = () => {
    if (loading) {
      return (
        <div className="space-y-4">
          <div className="h-4 bg-muted animate-pulse rounded" />
          <div className="h-20 bg-muted animate-pulse rounded" />
          <div className="h-32 bg-muted animate-pulse rounded" />
        </div>
      );
    }

    if (!content) {
      return (
        <div className="text-center py-8">
          <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">Help content not available</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Overview */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Overview</h3>
          <p className="text-muted-foreground">{content.overview}</p>
        </div>

        {/* Tab-Specific Help (if active) */}
        {renderTabSpecificHelp()}

        <Separator />

        {/* Key Features */}
        <Collapsible>
          <CollapsibleTrigger className="flex items-center justify-between w-full">
            <h3 className="text-lg font-semibold">Key Features</h3>
            <Badge variant="outline">{content.keyFeatures?.length || 0} features</Badge>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-3">
            {content.keyFeatures?.map((feature, index) => (
              <Card key={index} className="p-4">
                <h4 className="font-medium">{feature.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{feature.description}</p>
                {feature.gstRelevance && (
                  <p className="text-xs text-primary mt-2">
                    <strong>GST Relevance:</strong> {feature.gstRelevance}
                  </p>
                )}
              </Card>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Philosophy & Science */}
        <Collapsible>
          <CollapsibleTrigger className="flex items-center justify-between w-full">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              {content.philosophy?.title || 'Philosophy & Science'}
            </h3>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <p className="text-muted-foreground mb-3">{content.philosophy?.description}</p>
            <ul className="space-y-2">
              {content.philosophy?.principles?.map((principle, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                  {principle}
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>

        {/* Quick Start */}
        <Collapsible>
          <CollapsibleTrigger className="flex items-center justify-between w-full">
            <h3 className="text-lg font-semibold">Quick Start Guide</h3>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-2">
            {content.quickStart?.map((step, index) => (
              <div key={index} className="flex gap-3 p-3 bg-muted/30 rounded-lg">
                <Badge variant="outline" className="flex-shrink-0">{step.step}</Badge>
                <div className="flex-1">
                  <div className="text-sm">{step.action}</div>
                  {step.gstContext && (
                    <div className="text-xs text-primary mt-1">{step.gstContext}</div>
                  )}
                </div>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Related Tours */}
        {content.relatedTours && content.relatedTours.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3">Guided Tours</h3>
            <div className="flex flex-wrap gap-2">
              {content.relatedTours.map((tourId, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleStartTour(tourId)}
                  className="flex items-center gap-2"
                >
                  <BookOpen className="h-4 w-4" />
                  Start {tourId.replace('-', ' ')} Tour
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (variant === 'floating') {
    return (
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn("fixed bottom-4 right-4 z-50 shadow-lg", className)}
          >
            <HelpCircle className="h-4 w-4 mr-2" />
            Page Help
          </Button>
        </DrawerTrigger>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Help: {pageId.charAt(0).toUpperCase() + pageId.slice(1).replace('-', ' ')}
              {activeTab && <Badge variant="secondary">{activeTab}</Badge>}
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4 overflow-y-auto">
            {renderHelpContent()}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5" />
          Page Help
          {activeTab && <Badge variant="secondary">{activeTab}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {renderHelpContent()}
      </CardContent>
    </Card>
  );
};
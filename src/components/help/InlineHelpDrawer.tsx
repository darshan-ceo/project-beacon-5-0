import React, { useState, useEffect } from 'react';
import { HelpCircle, ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { helpService } from '@/services/helpService';
import { cn } from '@/lib/utils';

interface InlineHelpDrawerProps {
  module: string;
  context?: string;
  trigger?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

interface HelpContent {
  title: string;
  content: string;
  learnMoreUrl?: string;
  quickTips?: string[];
  relatedArticles?: { title: string; url: string }[];
}

export const InlineHelpDrawer: React.FC<InlineHelpDrawerProps> = ({
  module,
  context,
  trigger,
  className,
  size = 'md'
}) => {
  const [open, setOpen] = useState(false);
  const [helpContent, setHelpContent] = useState<HelpContent | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadHelpContent = async () => {
      if (!open) return;
      
      setLoading(true);
      try {
        const content = await helpService.getInlineHelp(module, context);
        setHelpContent(content);
      } catch (error) {
        console.error('Failed to load inline help:', error);
        setHelpContent(null);
      } finally {
        setLoading(false);
      }
    };

    loadHelpContent();
  }, [open, module, context]);

  const defaultTrigger = (
    <Button
      variant="ghost"
      size="sm"
      className={cn("h-6 w-6 p-0 text-muted-foreground hover:text-primary", className)}
      onClick={() => setOpen(true)}
    >
      <HelpCircle className="h-4 w-4" />
    </Button>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="h-6 bg-muted rounded animate-pulse" />
            <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded animate-pulse" />
            <div className="h-4 bg-muted rounded animate-pulse w-5/6" />
            <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
          </div>
        </div>
      );
    }

    if (!helpContent) {
      return (
        <div className="text-center py-8">
          <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Help Not Available</h3>
          <p className="text-muted-foreground">
            Help content for this section is being prepared.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">{helpContent.title}</h3>
          <p className="text-foreground leading-relaxed">{helpContent.content}</p>
        </div>

        {helpContent.quickTips && helpContent.quickTips.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium mb-2 text-sm">Quick Tips</h4>
              <ul className="space-y-1">
                {helpContent.quickTips.map((tip, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {helpContent.relatedArticles && helpContent.relatedArticles.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium mb-2 text-sm">Related Articles</h4>
              <div className="space-y-2">
                {helpContent.relatedArticles.map((article, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    className="justify-start h-auto p-2 w-full"
                    onClick={() => window.open(article.url, '_blank')}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{article.title}</span>
                      <ExternalLink className="h-3 w-3" />
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          </>
        )}

        {helpContent.learnMoreUrl && (
          <>
            <Separator />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.open(helpContent.learnMoreUrl, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Learn More
            </Button>
          </>
        )}
      </div>
    );
  };

  return (
    <>
      <span onClick={() => setOpen(true)}>
        {trigger || defaultTrigger}
      </span>
      
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className={cn(
          "max-h-[70vh]",
          size === 'sm' && "max-w-sm mx-auto",
          size === 'md' && "max-w-md mx-auto",
          size === 'lg' && "max-w-lg mx-auto"
        )}>
          <DrawerHeader className="text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-primary" />
                <div>
                  <DrawerTitle>Help</DrawerTitle>
                  <DrawerDescription>
                    {module.charAt(0).toUpperCase() + module.slice(1)} guidance
                  </DrawerDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DrawerHeader>
          
          <div className="px-4 pb-6 overflow-auto">
            {renderContent()}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
};
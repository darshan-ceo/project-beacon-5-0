/**
 * Help Detail Dialog
 * Displays full help entry content when clicking on help cards
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  ExternalLink,
  BookOpen,
  HelpCircle,
  Lightbulb,
  FileText,
  Layers,
  Sparkles,
  MessageSquare,
  ArrowRight,
  Tag
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HelpEntry } from '@/services/helpDiscoveryService';
import { useElementHighlight } from '@/hooks/useElementHighlight';

interface HelpDetailDialogProps {
  entry: HelpEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const sourceIcons: Record<string, React.ElementType> = {
  tooltip: HelpCircle,
  tour: Sparkles,
  article: BookOpen,
  'page-help': FileText,
  operations: Layers,
  masters: Lightbulb,
  faq: MessageSquare,
  glossary: BookOpen
};

const sourceColors: Record<string, string> = {
  tooltip: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  tour: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
  article: 'bg-green-500/10 text-green-700 dark:text-green-400',
  'page-help': 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
  operations: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400',
  masters: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  faq: 'bg-pink-500/10 text-pink-700 dark:text-pink-400',
  glossary: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400'
};

const sourceLabels: Record<string, string> = {
  tooltip: 'UI Tooltip',
  tour: 'Guided Tour',
  article: 'Help Article',
  'page-help': 'Page Help',
  operations: 'Workflow Guide',
  masters: 'Master Data',
  faq: 'FAQ',
  glossary: 'Glossary Term'
};

export const HelpDetailDialog: React.FC<HelpDetailDialogProps> = ({
  entry,
  open,
  onOpenChange
}) => {
  const navigate = useNavigate();
  const { navigateAndHighlight } = useElementHighlight();

  if (!entry) return null;

  const Icon = sourceIcons[entry.source] || HelpCircle;

  const handleViewInApp = () => {
    if (entry.uiLocation?.path) {
      navigateAndHighlight({
        path: entry.uiLocation.path,
        tab: entry.uiLocation.tab,
        element: entry.uiLocation.element
      });
      onOpenChange(false);
    }
  };

  const handleStartTour = () => {
    console.log('[HelpDetail] Start tour:', entry.id);
    onOpenChange(false);
    // Tour would be triggered here via shepherd service
  };

  const handleLearnMore = () => {
    if (entry.learnMoreUrl) {
      if (entry.learnMoreUrl.startsWith('http')) {
        window.open(entry.learnMoreUrl, '_blank');
      } else {
        navigate(entry.learnMoreUrl);
        onOpenChange(false);
      }
    }
  };

  const formatModule = (module: string) => {
    return module.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className={cn("p-2.5 rounded-lg flex-shrink-0", sourceColors[entry.source])}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg leading-tight pr-6">
                {entry.title}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className={cn("text-xs", sourceColors[entry.source])}>
                  {sourceLabels[entry.source]}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {formatModule(entry.module)}
                </Badge>
                {entry.isNew && (
                  <Badge className="text-xs bg-primary">New</Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <DialogBody className="px-6 py-4">
          <ScrollArea className="max-h-[40vh]">
            <div className="space-y-4">
              {/* Description */}
              <div>
                <p className="text-sm text-foreground leading-relaxed">
                  {entry.description}
                </p>
              </div>

              {/* Rich content if available - displayed prominently */}
              {entry.content && (
                <div className="bg-muted/50 rounded-lg p-4 border border-border/50">
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                    {entry.content}
                  </p>
                </div>
              )}

              {/* Tags */}
              {entry.tags.length > 0 && (
                <>
                  <Separator />
                  <div className="flex items-start gap-2">
                    <Tag className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex flex-wrap gap-1.5">
                      {entry.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Metadata */}
              <div className="text-xs text-muted-foreground pt-2 border-t">
                <p>Category: {entry.category}</p>
                <p>Last updated: {new Date(entry.updatedAt).toLocaleDateString()}</p>
              </div>
            </div>
          </ScrollArea>
        </DialogBody>

        <DialogFooter className="gap-2">
          {entry.learnMoreUrl && (
            <Button variant="outline" size="sm" onClick={handleLearnMore}>
              <BookOpen className="h-4 w-4 mr-1.5" />
              Learn More
            </Button>
          )}
          
          {entry.source === 'tour' && (
            <Button size="sm" onClick={handleStartTour}>
              <Sparkles className="h-4 w-4 mr-1.5" />
              Start Tour
            </Button>
          )}
          
          {entry.uiLocation?.path && entry.source !== 'tour' && (
            <Button size="sm" onClick={handleViewInApp}>
              <ArrowRight className="h-4 w-4 mr-1.5" />
              View in App
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

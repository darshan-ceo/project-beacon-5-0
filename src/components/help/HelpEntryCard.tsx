/**
 * Help Entry Card Component
 * Unified display for any help entry type with UI linking
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ExternalLink, 
  BookOpen, 
  HelpCircle, 
  Lightbulb, 
  FileText, 
  Layers,
  Sparkles,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HelpEntry } from '@/services/helpDiscoveryService';
import { useElementHighlight } from '@/hooks/useElementHighlight';

interface HelpEntryCardProps {
  entry: HelpEntry;
  compact?: boolean;
  showViewInApp?: boolean;
  onSelect?: (entry: HelpEntry) => void;
  className?: string;
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
  tooltip: 'Tooltip',
  tour: 'Guided Tour',
  article: 'Article',
  'page-help': 'Page Help',
  operations: 'Workflow',
  masters: 'Master Data',
  faq: 'FAQ',
  glossary: 'Glossary'
};

export const HelpEntryCard: React.FC<HelpEntryCardProps> = ({
  entry,
  compact = false,
  showViewInApp = true,
  onSelect,
  className
}) => {
  const navigate = useNavigate();
  const { navigateAndHighlight } = useElementHighlight();
  const Icon = sourceIcons[entry.source] || HelpCircle;

  const handleViewInApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (entry.uiLocation?.path) {
      navigateAndHighlight({
        path: entry.uiLocation.path,
        tab: entry.uiLocation.tab,
        element: entry.uiLocation.element
      });
    }
  };

  const handleClick = () => {
    if (onSelect) {
      onSelect(entry);
    } else if (entry.source === 'article' && entry.uiLocation?.path) {
      navigate(entry.uiLocation.path);
    } else if (entry.source === 'tour') {
      // Could trigger tour start here
      console.log('[HelpEntry] Start tour:', entry.id);
    }
  };

  const formatModule = (module: string) => {
    return module.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  if (compact) {
    return (
      <div 
        className={cn(
          "flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors",
          className
        )}
        onClick={handleClick}
      >
        <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{entry.title}</p>
          <p className="text-xs text-muted-foreground truncate">{entry.description}</p>
        </div>
        <Badge variant="outline" className={cn("text-xs flex-shrink-0", sourceColors[entry.source])}>
          {sourceLabels[entry.source]}
        </Badge>
      </div>
    );
  }

  return (
    <Card 
      className={cn(
        "cursor-pointer hover:shadow-md transition-all hover:border-primary/30",
        entry.isNew && "ring-1 ring-primary/20",
        className
      )}
      onClick={handleClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={cn("p-2 rounded-md flex-shrink-0", sourceColors[entry.source])}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium text-sm leading-tight">{entry.title}</h4>
                {entry.isNew && (
                  <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 bg-primary">
                    New
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {entry.description}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] flex-shrink-0">
            {formatModule(entry.module)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-1">
            {entry.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                {tag}
              </Badge>
            ))}
            {entry.tags.length > 3 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                +{entry.tags.length - 3}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {showViewInApp && entry.uiLocation?.path && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs gap-1"
                onClick={handleViewInApp}
              >
                <ExternalLink className="h-3 w-3" />
                View in App
              </Button>
            )}
          </div>
        </div>
        
        <p className="text-[10px] text-muted-foreground mt-2">
          Updated {new Date(entry.updatedAt).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );
};

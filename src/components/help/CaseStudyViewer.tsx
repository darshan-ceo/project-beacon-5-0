import React from 'react';
import { X, Clock, User, Tag } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface HelpContent {
  id: string;
  title: string;
  description: string;
  category: 'faq' | 'tutorial' | 'guide' | 'case-study' | 'best-practice';
  roles: string[];
  content: string;
  tags: string[];
  lastUpdated: string;
}

interface CaseStudyViewerProps {
  content: HelpContent;
  onClose: () => void;
}

export const CaseStudyViewer: React.FC<CaseStudyViewerProps> = ({
  content,
  onClose
}) => {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'faq': return '❓';
      case 'tutorial': return '📚';
      case 'guide': return '📖';
      case 'case-study': return '📋';
      case 'best-practice': return '⭐';
      default: return '📄';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'faq': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'tutorial': return 'bg-green-100 text-green-800 border-green-200';
      case 'guide': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'case-study': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'best-practice': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatContent = (content: string) => {
    // Basic markdown-like formatting
    return content
      .split('\n')
      .map((line, index) => {
        if (line.startsWith('# ')) {
          return <h1 key={index} className="text-2xl font-bold mt-6 mb-4 first:mt-0">{line.slice(2)}</h1>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={index} className="text-xl font-semibold mt-5 mb-3">{line.slice(3)}</h2>;
        }
        if (line.startsWith('### ')) {
          return <h3 key={index} className="text-lg font-medium mt-4 mb-2">{line.slice(4)}</h3>;
        }
        if (line.startsWith('- ')) {
          return <li key={index} className="ml-4 mb-1">{line.slice(2)}</li>;
        }
        if (line.startsWith('**') && line.endsWith('**')) {
          return <p key={index} className="font-semibold mb-2">{line.slice(2, -2)}</p>;
        }
        if (line.trim() === '') {
          return <br key={index} />;
        }
        return <p key={index} className="mb-2 leading-relaxed">{line}</p>;
      });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{getCategoryIcon(content.category)}</span>
                <Badge 
                  variant="outline" 
                  className={cn("text-xs", getCategoryColor(content.category))}
                >
                  {content.category}
                </Badge>
              </div>
              <DialogTitle className="text-xl font-bold leading-tight">
                {content.title}
              </DialogTitle>
              <p className="text-muted-foreground mt-1">{content.description}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="flex-shrink-0 h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Metadata */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Updated {new Date(content.lastUpdated).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span>For {content.roles.join(', ')}</span>
            </div>
            {content.tags.length > 0 && (
              <div className="flex items-center gap-1">
                <Tag className="h-3 w-3" />
                <span>{content.tags.length} tags</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {content.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-2">
              {content.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          <Separator className="mt-4" />
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="prose prose-sm max-w-none pr-4">
            <div className="space-y-2">
              {formatContent(content.content)}
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex-shrink-0 pt-4 border-t">
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">
              Need more help? Check the Help Center for additional resources.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
              <Button 
                size="sm" 
                onClick={() => {
                  window.open('/help', '_blank');
                  onClose();
                }}
              >
                Open Help Center
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
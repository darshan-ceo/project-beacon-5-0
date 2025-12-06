import React, { useState } from 'react';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CollapsibleDescriptionProps {
  description: string;
  className?: string;
}

export const CollapsibleDescription: React.FC<CollapsibleDescriptionProps> = ({
  description,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!description || description.trim() === '') {
    return null;
  }

  return (
    <div className={cn('border-b', className)}>
      <Button
        variant="ghost"
        className="w-full justify-between px-4 py-3 h-auto hover:bg-muted/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span>Task Description</span>
          {!isExpanded && (
            <span className="text-muted-foreground font-normal truncate max-w-[200px]">
              — {description.slice(0, 50)}{description.length > 50 ? '...' : ''}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </Button>
      
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 bg-muted/30">
          <div 
            className="prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: description }}
          />
        </div>
      )}
    </div>
  );
};

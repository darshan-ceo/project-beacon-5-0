import React, { useState, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { helpService } from '@/services/helpService';
import { cn } from '@/lib/utils';

interface GlossaryTerm {
  term: string;
  definition: string;
  technicalNote?: string;
  relatedTerms?: string[];
  category: 'legal' | 'technical' | 'process' | 'compliance';
}

interface GlossaryTooltipProps {
  term: string;
  children?: React.ReactNode;
  className?: string;
  showIcon?: boolean;
}

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'legal': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'technical': return 'bg-green-100 text-green-800 border-green-200';
    case 'process': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'compliance': return 'bg-orange-100 text-orange-800 border-orange-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const GlossaryTooltip: React.FC<GlossaryTooltipProps> = ({
  term,
  children,
  className,
  showIcon = false
}) => {
  const [glossaryTerm, setGlossaryTerm] = useState<GlossaryTerm | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const loadTerm = async () => {
      if (loaded) return;
      
      setLoading(true);
      try {
        const terms = await helpService.getGlossaryTerms();
        const foundTerm = terms.find(t => 
          t.term.toLowerCase() === term.toLowerCase()
        );
        setGlossaryTerm(foundTerm || null);
      } catch (error) {
        console.error('Failed to load glossary term:', error);
      } finally {
        setLoading(false);
        setLoaded(true);
      }
    };

    loadTerm();
  }, [term, loaded]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="max-w-xs space-y-2">
          <div className="h-4 bg-muted rounded animate-pulse" />
          <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
        </div>
      );
    }

    if (!glossaryTerm) {
      return (
        <div className="max-w-xs">
          <p className="text-sm">No definition available for "{term}"</p>
        </div>
      );
    }

    return (
      <div className="max-w-sm space-y-3">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold text-sm">{glossaryTerm.term}</h4>
            <Badge 
              variant="outline" 
              className={cn("text-xs", getCategoryColor(glossaryTerm.category))}
            >
              {glossaryTerm.category}
            </Badge>
          </div>
          <p className="text-sm text-foreground">{glossaryTerm.definition}</p>
        </div>

        {glossaryTerm.technicalNote && (
          <div className="border-t pt-2">
            <p className="text-xs text-muted-foreground">
              <strong>Technical:</strong> {glossaryTerm.technicalNote}
            </p>
          </div>
        )}

        {glossaryTerm.relatedTerms && glossaryTerm.relatedTerms.length > 0 && (
          <div className="border-t pt-2">
            <p className="text-xs font-medium mb-1">Related Terms:</p>
            <div className="flex flex-wrap gap-1">
              {glossaryTerm.relatedTerms.map(relatedTerm => (
                <Badge key={relatedTerm} variant="secondary" className="text-xs">
                  {relatedTerm}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <span className={cn(
            'inline-flex items-center gap-1 cursor-help',
            glossaryTerm ? 'text-primary hover:text-primary/80' : 'text-muted-foreground',
            'border-b border-dotted border-current',
            className
          )}>
            {children || term}
            {showIcon && <HelpCircle className="h-3 w-3" />}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="z-50">
          {renderContent()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Higher-order component to automatically wrap terms
export const withGlossary = (WrappedComponent: React.ComponentType<any>) => {
  return React.forwardRef<any, any>((props, ref) => {
    const { children, ...otherProps } = props;
    
    if (typeof children === 'string') {
      // List of terms to automatically wrap
      const termsToWrap = ['RAG', 'SLA', 'DRC', 'ASMT', 'RBAC', 'GST'];
      
      let processedChildren = children;
      termsToWrap.forEach(term => {
        const regex = new RegExp(`\\b${term}\\b`, 'gi');
        processedChildren = processedChildren.replace(regex, (match: string) => 
          `<GlossaryTooltip term="${match}">${match}</GlossaryTooltip>`
        );
      });
      
      // Note: This is a simplified example. In a real implementation,
      // you'd need a more sophisticated text processing approach
      return <WrappedComponent ref={ref} {...otherProps}>{processedChildren}</WrappedComponent>;
    }
    
    return <WrappedComponent ref={ref} {...otherProps}>{children}</WrappedComponent>;
  });
};
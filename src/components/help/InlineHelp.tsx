import React from 'react';
import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InlineHelpDrawer } from './InlineHelpDrawer';
import { cn } from '@/lib/utils';

interface InlineHelpProps {
  module: string;
  context?: string;
  className?: string;
  size?: 'sm' | 'lg';
  variant?: 'icon' | 'text' | 'button';
  text?: string;
}

export const InlineHelp: React.FC<InlineHelpProps> = ({
  module,
  context,
  className,
  size = 'sm',
  variant = 'icon',
  text = 'Help'
}) => {
  const renderTrigger = () => {
    switch (variant) {
      case 'text':
        return (
          <Button
            variant="link"
            size="sm"
            className={cn("h-auto p-0 text-muted-foreground hover:text-primary", className)}
          >
            <HelpCircle className="h-3 w-3 mr-1" />
            {text}
          </Button>
        );
      
      case 'button':
        return (
          <Button
            variant="outline"
            size={size}
            className={cn("flex items-center gap-2", className)}
          >
            <HelpCircle className="h-4 w-4" />
            {text}
          </Button>
        );
      
      default: // 'icon'
        return (
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-6 w-6 p-0 text-muted-foreground hover:text-primary",
              className
            )}
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
        );
    }
  };

  return (
    <InlineHelpDrawer
      module={module}
      context={context}
      trigger={renderTrigger()}
      size={size}
    />
  );
};
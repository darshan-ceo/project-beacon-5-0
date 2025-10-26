/**
 * Search Type Indicator Component
 * Reusable badge to distinguish search types
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Globe, LucideIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SearchTypeIndicatorProps {
  type: 'global' | 'module';
  moduleName?: string;
  icon?: LucideIcon;
  tooltip?: string;
}

export const SearchTypeIndicator: React.FC<SearchTypeIndicatorProps> = ({
  type,
  moduleName,
  icon: Icon,
  tooltip
}) => {
  const isGlobal = type === 'global';
  const DisplayIcon = Icon || (isGlobal ? Globe : undefined);
  
  const label = isGlobal ? 'Global' : moduleName || 'Module';
  const variant = isGlobal ? 'default' : 'secondary';
  const className = isGlobal 
    ? 'bg-primary text-primary-foreground font-medium'
    : 'bg-muted text-muted-foreground';

  const badge = (
    <Badge variant={variant} className={`text-xs ${className}`}>
      {DisplayIcon && <DisplayIcon className="h-3 w-3 mr-1" />}
      {label}
    </Badge>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badge}
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
};

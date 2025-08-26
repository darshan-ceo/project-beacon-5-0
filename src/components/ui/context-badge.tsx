import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContextBadgeProps {
  label: string;
  value: string;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  onView?: () => void;
  onRemove?: () => void;
  className?: string;
}

export const ContextBadge: React.FC<ContextBadgeProps> = ({
  label,
  value,
  variant = 'secondary',
  onView,
  onRemove,
  className
}) => {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-sm text-muted-foreground">{label}:</span>
      <Badge variant={variant} className="flex items-center gap-1">
        <span>{value}</span>
        {onView && (
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-0 text-current hover:bg-transparent"
            onClick={onView}
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        )}
        {onRemove && (
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-0 text-current hover:bg-transparent"
            onClick={onRemove}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </Badge>
    </div>
  );
};
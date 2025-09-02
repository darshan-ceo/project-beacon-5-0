/**
 * Source Chip Component for Beacon Essential 5.0
 * Visual indicator for data source with edit capability
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit2, Lock, Unlock } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DataSource = 'public' | 'gsp' | 'manual' | 'edited';

interface SourceChipProps {
  source: DataSource;
  isLocked?: boolean;
  canEdit?: boolean;
  onToggleEdit?: () => void;
  className?: string;
}

const sourceConfig: Record<DataSource, {
  label: string;
  className: string;
  icon?: React.ReactNode;
}> = {
  public: {
    label: 'Public',
    className: 'bg-success/10 text-success border-success/20 hover:bg-success/20',
  },
  gsp: {
    label: 'GSP',
    className: 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20',
  },
  manual: {
    label: 'Manual',
    className: 'bg-muted text-muted-foreground border-border hover:bg-muted',
  },
  edited: {
    label: 'Edited',
    className: 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/20',
  }
};

export const SourceChip: React.FC<SourceChipProps> = ({
  source,
  isLocked = false,
  canEdit = false,
  onToggleEdit,
  className
}) => {
  const config = sourceConfig[source];

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Badge 
        variant="outline" 
        className={cn(
          'text-xs font-medium',
          config.className
        )}
      >
        {config.label}
      </Badge>
      
      {canEdit && onToggleEdit && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0 hover:bg-muted"
          onClick={onToggleEdit}
          title={isLocked ? 'Edit anyway' : 'Lock field'}
        >
          {isLocked ? (
            <Lock className="h-3 w-3" />
          ) : (
            <Edit2 className="h-3 w-3" />
          )}
        </Button>
      )}
    </div>
  );
};

/**
 * Source Chip with Edit Button for form fields
 */
interface EditableSourceChipProps extends SourceChipProps {
  fieldName: string;
  showEditButton?: boolean;
}

export const EditableSourceChip: React.FC<EditableSourceChipProps> = ({
  source,
  isLocked,
  fieldName,
  showEditButton = true,
  onToggleEdit,
  className
}) => {
  if (!showEditButton || source === 'manual') {
    return <SourceChip source={source} className={className} />;
  }

  return (
    <SourceChip
      source={source}
      isLocked={isLocked}
      canEdit={showEditButton}
      onToggleEdit={onToggleEdit}
      className={className}
    />
  );
};

/**
 * Helper function to determine chip variant based on source
 */
export const getSourceChipVariant = (source: DataSource): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (source) {
    case 'public':
    case 'gsp':
      return 'default';
    case 'edited':
      return 'destructive';
    default:
      return 'outline';
  }
};
import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export interface FormStickyFooterProps {
  /** Primary action button text */
  primaryLabel?: string;
  /** Primary action handler */
  onPrimaryAction?: () => void;
  /** Primary action loading state */
  isPrimaryLoading?: boolean;
  /** Disable primary action */
  isPrimaryDisabled?: boolean;
  
  /** Cancel/Close button text */
  cancelLabel?: string;
  /** Cancel action handler */
  onCancel: () => void;
  
  /** Optional delete button */
  showDelete?: boolean;
  deleteLabel?: string;
  onDelete?: () => void;
  isDeleteLoading?: boolean;
  
  /** Mode for conditional display */
  mode?: 'create' | 'edit' | 'view';
  
  /** Additional className */
  className?: string;
}

/**
 * Standardized sticky footer for all adaptive forms
 * Provides consistent button layout across all form containers
 */
export const FormStickyFooter: React.FC<FormStickyFooterProps> = ({
  primaryLabel = 'Save',
  onPrimaryAction,
  isPrimaryLoading = false,
  isPrimaryDisabled = false,
  cancelLabel = 'Cancel',
  onCancel,
  showDelete = false,
  deleteLabel = 'Delete',
  onDelete,
  isDeleteLoading = false,
  mode = 'create',
  className,
}) => {
  const isViewMode = mode === 'view';

  return (
    <div
      className={cn(
        'sticky bottom-0 flex items-center justify-end gap-3 border-t border-border bg-background px-6 py-4',
        className
      )}
    >
      <Button type="button" variant="outline" onClick={onCancel}>
        {isViewMode ? 'Close' : cancelLabel}
      </Button>

      {showDelete && mode === 'edit' && onDelete && (
        <Button
          type="button"
          variant="destructive"
          onClick={onDelete}
          disabled={isDeleteLoading}
        >
          {isDeleteLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Deleting...
            </>
          ) : (
            deleteLabel
          )}
        </Button>
      )}

      {!isViewMode && onPrimaryAction && (
        <Button
          type="button"
          onClick={onPrimaryAction}
          disabled={isPrimaryLoading || isPrimaryDisabled}
        >
          {isPrimaryLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            primaryLabel
          )}
        </Button>
      )}
    </div>
  );
};

import * as React from 'react';
import { useDeviceType } from '@/hooks/useDeviceType';
import { FormComplexity } from '@/utils/formComplexityClassifier';
import { FullPageForm } from '@/components/ui/full-page-form';
import { LargeSlideOver } from '@/components/ui/large-slide-over';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export type AdaptiveFormMode = 'page' | 'drawer' | 'modal';

export interface AdaptiveFormShellProps {
  /** Whether the form is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Form title */
  title: string;
  /** Optional description */
  description?: string;
  /** Optional icon next to title */
  icon?: React.ReactNode;
  /** Main form content */
  children: React.ReactNode;
  /** Footer content (typically action buttons) */
  footer?: React.ReactNode;
  /** Form complexity - determines container selection */
  complexity?: FormComplexity;
  /** Force a specific mode (for testing/overrides) */
  forceMode?: AdaptiveFormMode;
  /** Additional className */
  className?: string;
  /** Data attribute for testing/tours */
  dataTour?: string;
}

/**
 * Adaptive Form Shell - AFPA Implementation
 * 
 * Automatically selects the appropriate container based on:
 * - Device type (mobile, tablet, desktop)
 * - Form complexity (simple, complex)
 * 
 * Rendering Logic:
 * | Screen       | Complex Form      | Simple Form     |
 * |--------------|-------------------|-----------------|
 * | Desktop      | Full-page overlay | Large modal     |
 * | Tablet       | Large slide-over  | Large modal     |
 * | Mobile       | Full-screen modal | Full-screen modal|
 */
export const AdaptiveFormShell: React.FC<AdaptiveFormShellProps> = ({
  isOpen,
  onClose,
  title,
  description,
  icon,
  children,
  footer,
  complexity = 'complex',
  forceMode,
  className,
  dataTour,
}) => {
  const deviceType = useDeviceType();

  // Determine the appropriate mode
  const mode = React.useMemo<AdaptiveFormMode>(() => {
    if (forceMode) return forceMode;

    if (complexity === 'complex') {
      switch (deviceType) {
        case 'desktop':
          return 'page';
        case 'tablet':
          return 'drawer';
        case 'mobile':
        default:
          return 'modal';
      }
    }

    // Simple forms use modal on all devices (but larger on desktop/tablet)
    return 'modal';
  }, [deviceType, complexity, forceMode]);

  // Full-page overlay for desktop complex forms
  if (mode === 'page') {
    return (
      <FullPageForm
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        description={description}
        icon={icon}
        footer={footer}
        className={className}
        dataTour={dataTour}
      >
        {children}
      </FullPageForm>
    );
  }

  // Large slide-over drawer for tablet complex forms
  if (mode === 'drawer') {
    return (
      <LargeSlideOver
        isOpen={isOpen}
        onOpenChange={(open) => !open && onClose()}
        title={title}
        description={description}
        icon={icon}
        footer={footer}
        dataTour={dataTour}
      >
        {children}
      </LargeSlideOver>
    );
  }

  // Standard modal (full-screen on mobile, large on tablet/desktop for simple forms)
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          // Full-screen on mobile for all forms
          'max-sm:h-[100dvh] max-sm:max-h-none max-sm:w-screen max-sm:max-w-none max-sm:rounded-none max-sm:border-0',
          // Large modal for tablet/desktop simple forms
          'sm:max-w-beacon-modal sm:max-h-[90vh]',
          className
        )}
        data-tour={dataTour}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {icon}
            {title}
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <DialogBody className="space-y-6">{children}</DialogBody>

        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
};

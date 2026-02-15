import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface FullPageFormProps {
  /** Whether the form is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Form title */
  title: string;
  /** Optional description below title */
  description?: string;
  /** Optional icon next to title */
  icon?: React.ReactNode;
  /** Main form content */
  children: React.ReactNode;
  /** Footer with action buttons */
  footer?: React.ReactNode;
  /** Additional className for content area */
  className?: string;
  /** Data attribute for testing/tours */
  dataTour?: string;
}

/**
 * Full-page overlay container for complex forms on desktop
 * Features:
 * - Sticky header with title and close button
 * - Scrollable body area
 * - Sticky footer for action buttons
 * - Maintains brand styling
 */
export const FullPageForm: React.FC<FullPageFormProps> = ({
  isOpen,
  onClose,
  title,
  description,
  icon,
  children,
  footer,
  className,
  dataTour,
}) => {
  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const content = (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="full-page-form-title"
      data-tour={dataTour}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in-0 duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Content container */}
      <div
        className={cn(
          'relative z-10 flex h-[calc(100vh-64px)] w-full max-w-4xl flex-col overflow-hidden',
          'bg-background border border-border rounded-beacon-xl shadow-beacon-xl',
          'animate-in fade-in-0 zoom-in-95 duration-300',
          className
        )}
      >
        {/* Sticky Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-6 py-4">
          <div className="flex items-center gap-3">
            {icon && <span className="text-primary">{icon}</span>}
            <div>
              <h2
                id="full-page-form-title"
                className="text-h3 font-medium leading-none tracking-tight text-foreground"
              >
                {title}
              </h2>
              {description && (
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </header>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto max-w-3xl space-y-6">{children}</div>
        </div>

        {/* Sticky Footer */}
        {footer && (
          <footer className="sticky bottom-0 z-10 border-t border-border bg-background">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );

  // Render in portal
  return createPortal(content, document.body);
};

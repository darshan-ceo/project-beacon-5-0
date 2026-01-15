import * as React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

export interface LargeSlideOverProps {
  /** Whether the slide-over is open */
  isOpen: boolean;
  /** Close handler */
  onOpenChange: (open: boolean) => void;
  /** Form title */
  title: string;
  /** Optional description */
  description?: string;
  /** Optional icon next to title */
  icon?: React.ReactNode;
  /** Main content */
  children: React.ReactNode;
  /** Footer with action buttons */
  footer?: React.ReactNode;
  /** Data attribute for testing/tours */
  dataTour?: string;
}

/**
 * Large slide-over drawer for complex forms on tablet
 * Features:
 * - 95% viewport width on tablet, 80% on larger screens
 * - Slides in from right
 * - Sticky header and footer
 * - Scrollable content area
 */
export const LargeSlideOver: React.FC<LargeSlideOverProps> = ({
  isOpen,
  onOpenChange,
  title,
  description,
  icon,
  children,
  footer,
  dataTour,
}) => {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          'flex h-full w-[95vw] max-w-4xl flex-col p-0',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
          'data-[state=closed]:duration-300 data-[state=open]:duration-500'
        )}
        data-tour={dataTour}
      >
        {/* Custom close button - hide default */}
        <style>{`.sheet-close-button { display: none !important; }`}</style>

        {/* Sticky Header */}
        <SheetHeader className="sticky top-0 z-10 flex flex-row items-center justify-between border-b border-border bg-background px-6 py-4">
          <div className="flex items-center gap-3">
            {icon && <span className="text-primary">{icon}</span>}
            <div className="text-left">
              <SheetTitle className="text-h3 font-medium">{title}</SheetTitle>
              {description && (
                <SheetDescription className="mt-1">{description}</SheetDescription>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 rounded-full"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </SheetHeader>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-6">{children}</div>
        </div>

        {/* Sticky Footer */}
        {footer && (
          <div className="sticky bottom-0 z-10 border-t border-border bg-background">
            {footer}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

/**
 * Three-Layer Help Component
 * Provides Label + Visible Explanation + Tooltip for UI elements
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { uiHelpService } from '@/services/uiHelpService';
import { featureFlagService } from '@/services/featureFlagService';
import { cn } from '@/lib/utils';

interface ThreeLayerHelpProps {
  helpId: string;
  children?: React.ReactNode;
  showExplanation?: boolean;
  showTooltipIcon?: boolean;
  className?: string;
  forceOpen?: boolean; // External control for single-tooltip policy
  showTooltipTitle?: boolean; // Control whether to show title in tooltip (default: true)
  onOpenChange?: (open: boolean) => void; // Controlled mode callback
}

export const ThreeLayerHelp: React.FC<ThreeLayerHelpProps> = ({
  helpId,
  children,
  showExplanation = true,
  showTooltipIcon = true,
  className = "",
  forceOpen,
  showTooltipTitle = true,
  onOpenChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Use forceOpen if provided, otherwise internal state
  const effectiveIsOpen = forceOpen !== undefined ? forceOpen : isOpen;
  const controlled = forceOpen !== undefined;
  
  // ESC key handler for accessibility
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && effectiveIsOpen) {
        if (controlled) {
          onOpenChange?.(false);
        } else {
          setIsOpen(false);
        }
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [effectiveIsOpen, controlled, onOpenChange]);

  // Check if tooltips are enabled
  if (!featureFlagService.isEnabled('tooltips_v1')) {
    return <>{children}</>;
  }

  const helpData = uiHelpService.getHelp(helpId);
  
  // Graceful degradation if help data not found
  if (!helpData) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`No help data found for: ${helpId}`);
    }
    return <>{children}</>;
  }

  return (
    <div className={`inline-flex flex-col gap-0.5 ${className}`}>
      {/* Layer 1: Label (always visible) */}
      <div className="flex items-center gap-1.5">
        {children || <span className="text-body font-medium">{helpData.label}</span>}
        
        {/* Layer 3: Popover icon (click to open) */}
        {showTooltipIcon && (
          <Popover open={effectiveIsOpen} onOpenChange={(open) => { onOpenChange?.(open); if (!controlled) setIsOpen(open); }}>
            <PopoverTrigger asChild>
              <button
                type="button"
                role="button"
                aria-haspopup="dialog"
                aria-controls={`popover-${helpId}`}
                aria-expanded={effectiveIsOpen}
                aria-label={helpData.accessibility.ariaLabel}
                className={cn(
                  "inline-flex items-center justify-center w-4 h-4 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm touch-manipulation cursor-pointer",
                  effectiveIsOpen 
                    ? "text-primary bg-primary/10" 
                    : "text-muted-foreground"
                )}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (controlled) {
                    onOpenChange?.(!effectiveIsOpen);
                  } else {
                    setIsOpen((v) => !v);
                  }
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  if (controlled) {
                    onOpenChange?.(!effectiveIsOpen);
                  } else {
                    setIsOpen((v) => !v);
                  }
                }}
                tabIndex={0}
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </PopoverTrigger>
            
            <PopoverContent
              id={`popover-${helpId}`}
              role="dialog"
              side="top"
              align="center"
              sideOffset={8}
              className="z-[9999] w-auto max-w-[320px] p-0 overflow-hidden bg-slate-800 text-slate-50 border-none shadow-[0_8px_24px_rgba(0,0,0,0.2)] rounded-lg"
            >
              <AnimatePresence>
                {effectiveIsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="pointer-events-auto"
                  >
                    <div className={cn("p-3", showTooltipTitle ? "space-y-2" : "")}>
                      {showTooltipTitle && (
                        <p className="font-semibold text-sm font-inter text-slate-50">
                          {helpData.tooltip.title}
                        </p>
                      )}
                      <p className="text-[13px] leading-5 text-slate-300 break-words">
                        {helpData.tooltip.content}
                      </p>
                      {helpData.accessibility.keyboardShortcut && (
                        <div className="text-xs text-slate-400 pt-1 border-t border-slate-700">
                          Shortcut: <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-xs font-mono">{helpData.accessibility.keyboardShortcut}</kbd>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </PopoverContent>
          </Popover>
        )}
      </div>
      
      {/* Layer 2: Visible Explanation (conditionally shown, subtle) */}
      {showExplanation && helpData.explanation && (
        <motion.p
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.2 }}
          className="text-xs text-muted-foreground"
        >
          {helpData.explanation}
        </motion.p>
      )}
    </div>
  );
};

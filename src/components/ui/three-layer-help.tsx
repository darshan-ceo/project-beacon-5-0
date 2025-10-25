/**
 * Three-Layer Help Component
 * Provides Label + Visible Explanation + Tooltip for UI elements
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle } from 'lucide-react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { uiHelpService } from '@/services/uiHelpService';
import { featureFlagService } from '@/services/featureFlagService';
import { cn } from '@/lib/utils';

interface ThreeLayerHelpProps {
  helpId: string;
  children?: React.ReactNode;
  showExplanation?: boolean;
  showTooltipIcon?: boolean;
  className?: string;
}

export const ThreeLayerHelp: React.FC<ThreeLayerHelpProps> = ({
  helpId,
  children,
  showExplanation = true,
  showTooltipIcon = true,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
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
        
        {/* Layer 3: Tooltip icon (hover/focus) */}
        {showTooltipIcon && (
          <TooltipProvider delayDuration={300}>
            <Tooltip open={isOpen} onOpenChange={setIsOpen}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "inline-flex items-center justify-center w-4 h-4 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm",
                    isOpen 
                      ? "text-primary bg-primary/10" 
                      : "text-muted-foreground hover:text-primary"
                  )}
                  aria-label={helpData.accessibility.ariaLabel}
                  aria-expanded={isOpen}
                  onMouseEnter={() => setIsOpen(true)}
                  onMouseLeave={() => setIsOpen(false)}
                  onFocus={() => setIsOpen(true)}
                  onBlur={() => setIsOpen(false)}
                  tabIndex={0}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              
              <TooltipPrimitive.Portal>
                <AnimatePresence>
                  {isOpen && (
                    <TooltipContent
                      side="top"
                      align="center"
                      sideOffset={8}
                      collisionPadding={16}
                      avoidCollisions={true}
                      className="z-[9999] max-w-[280px] break-words p-0 overflow-hidden bg-[#1E293B] text-[#F8FAFC] border-none"
                      asChild
                    >
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                      >
                        <div className="p-3 space-y-2 rounded-[6px]">
                          <p className="font-semibold text-sm text-[#F8FAFC]">
                            {helpData.tooltip.title}
                          </p>
                          <p className="text-xs leading-relaxed text-[#CBD5E1] break-words">
                            {helpData.tooltip.content}
                          </p>
                          {helpData.tooltip.learnMoreUrl && (
                            <a
                              href={helpData.tooltip.learnMoreUrl}
                              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Learn more →
                            </a>
                          )}
                          {helpData.accessibility.keyboardShortcut && (
                            <div className="text-xs text-muted-foreground pt-1 border-t border-border">
                              Shortcut: <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">{helpData.accessibility.keyboardShortcut}</kbd>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    </TooltipContent>
                  )}
                </AnimatePresence>
              </TooltipPrimitive.Portal>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      
      {/* Layer 2: Visible Explanation (always shown, subtle) */}
      {showExplanation && helpData.explanation && (
        <motion.p
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.2 }}
          className="text-small text-muted-foreground"
        >
          {helpData.explanation}
        </motion.p>
      )}
    </div>
  );
};

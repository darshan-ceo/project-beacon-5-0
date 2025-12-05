import * as React from "react"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Info, X } from "lucide-react"
import { type LucideIcon } from "lucide-react"

interface BeaconModalContentProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  subtitle?: string
  infoTooltip?: string
  icon?: LucideIcon
  helpText?: string
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
  maxWidth?: string
}

/**
 * Beacon 5.0 ESS Universal Modal Component
 * 
 * Black accent design system with:
 * - Fixed 80vh height (no jumping between tabs)
 * - Card-based content layouts
 * - Info icons with tooltips
 * - Single-line help text
 * - Ghost cancel + Black primary action buttons
 */
export const BeaconModalContent: React.FC<BeaconModalContentProps> = ({
  open,
  onOpenChange,
  title,
  subtitle,
  infoTooltip,
  icon: Icon,
  helpText,
  children,
  footer,
  className,
  maxWidth = "max-w-beacon-modal"
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={cn(
          "beacon-modal h-[80vh] flex flex-col p-0",
          "bg-[hsl(210,40%,98%)] border-[hsl(214,32%,91%)] rounded-xl",
          "shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]",
          maxWidth,
          className
        )}
        data-beacon-modal="true"
      >
        {/* Header */}
        <DialogHeader className="px-6 py-5 border-b border-[hsl(214,32%,91%)] bg-white rounded-t-xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold text-[hsl(215,25%,17%)] flex items-center gap-2">
              {Icon && (
                <div className="p-2 rounded-lg bg-[hsl(0,0%,0%,0.05)]">
                  <Icon className="h-5 w-5 text-[hsl(0,0%,0%)]" />
                </div>
              )}
              <span>{title}</span>
              {infoTooltip && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="p-1 rounded-full bg-[hsl(214,32%,96%)] cursor-help">
                      <Info className="h-3.5 w-3.5 text-[hsl(215,16%,47%)]" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent 
                    className="bg-white border border-[hsl(214,32%,91%)] shadow-lg text-[hsl(215,16%,27%)] max-w-xs"
                  >
                    {infoTooltip}
                  </TooltipContent>
                </Tooltip>
              )}
            </DialogTitle>
          </div>
          {subtitle && (
            <p className="text-sm text-[hsl(215,16%,47%)] mt-1">{subtitle}</p>
          )}
        </DialogHeader>

        {/* Body with scroll */}
        <div className="flex-1 overflow-y-auto px-6 py-5 bg-[hsl(210,40%,98%)]">
          {helpText && (
            <p className="text-sm text-[hsl(215,16%,47%)] mb-4 italic">{helpText}</p>
          )}
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <DialogFooter className="px-6 py-4 border-t border-[hsl(214,32%,91%)] bg-white rounded-b-xl flex-shrink-0">
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default BeaconModalContent

import * as React from "react"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

interface ModalLayoutProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  icon?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
  showHeaderDivider?: boolean
  showFooterDivider?: boolean
  maxWidth?: string
}

/**
 * Standardized Modal Layout Component
 * 
 * Enforces consistent structure across all modals:
 * - 24px padding on all sides
 * - Header with divider
 * - Scrollable body
 * - Right-aligned footer buttons
 * - 16px spacing between form fields
 */
export const ModalLayout: React.FC<ModalLayoutProps> = ({
  open,
  onOpenChange,
  title,
  description,
  icon,
  children,
  footer,
  className,
  showHeaderDivider = true,
  showFooterDivider = true,
  maxWidth = "max-w-beacon-modal"
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(maxWidth, className)}>
        <DialogHeader showDivider={showHeaderDivider}>
          <DialogTitle className="flex items-center gap-2">
            {icon}
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>
        
        <DialogBody className="space-y-4">
          {children}
        </DialogBody>
        
        {footer && (
          <DialogFooter showDivider={showFooterDivider}>
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
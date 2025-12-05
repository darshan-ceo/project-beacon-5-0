import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { type LucideIcon } from "lucide-react"

interface BeaconCardProps {
  icon?: LucideIcon
  title: string
  badge?: string
  badgeTooltip?: string
  description?: string
  helpText?: string
  actionLabel?: string
  onAction?: () => void
  children?: React.ReactNode
  className?: string
  selected?: boolean
}

/**
 * Beacon 5.0 ESS Universal Card Component
 * 
 * Uniform card layout for modal content:
 * - White card with light grey border
 * - Rounded corners with hover elevation
 * - Icon at top-left
 * - Title + Category badge
 * - Description (1-2 lines)
 * - One-line helper text
 * - Right-aligned CTA button in black accent
 */
export const BeaconCard: React.FC<BeaconCardProps> = ({
  icon: Icon,
  title,
  badge,
  badgeTooltip,
  description,
  helpText,
  actionLabel,
  onAction,
  children,
  className,
  selected = false
}) => {
  const [isHovered, setIsHovered] = React.useState(false)

  return (
    <Card 
      className={cn(
        "border-[hsl(214,32%,91%)] bg-white rounded-xl transition-all duration-200",
        isHovered && "border-[hsl(0,0%,0%,0.3)] shadow-lg",
        selected && "border-[hsl(0,0%,0%)] ring-1 ring-[hsl(0,0%,0%)]",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          {Icon && (
            <div className="p-2 rounded-lg bg-[hsl(0,0%,0%,0.05)] flex-shrink-0">
              <Icon className="h-4 w-4 text-[hsl(0,0%,0%)]" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-[hsl(215,25%,17%)] truncate">{title}</span>
              {badge && (
                badgeTooltip ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge 
                        variant="outline" 
                        className="bg-[hsl(214,32%,96%)] text-[hsl(215,16%,27%)] border-[hsl(214,32%,91%)] text-xs flex-shrink-0"
                      >
                        {badge}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent className="bg-white border border-[hsl(214,32%,91%)] shadow-lg text-[hsl(215,16%,27%)]">
                      {badgeTooltip}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Badge 
                    variant="outline" 
                    className="bg-[hsl(214,32%,96%)] text-[hsl(215,16%,27%)] border-[hsl(214,32%,91%)] text-xs flex-shrink-0"
                  >
                    {badge}
                  </Badge>
                )
              )}
            </div>
            {description && (
              <p className="text-sm text-[hsl(215,16%,27%)] line-clamp-2">{description}</p>
            )}
            {helpText && (
              <p className="text-xs text-[hsl(215,16%,47%)] italic mt-1">{helpText}</p>
            )}
            {children}
          </div>
          {actionLabel && onAction && (
            <Button 
              size="sm"
              className="bg-[hsl(0,0%,0%)] text-white hover:bg-[hsl(0,0%,15%)] shadow-sm flex-shrink-0"
              onClick={onAction}
            >
              {actionLabel}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default BeaconCard

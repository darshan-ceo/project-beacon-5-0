/**
 * StandardDashboardCard - Unified KPI card wrapper
 * Provides consistent styling matching Compliance Dashboard
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type WidgetColorTheme = 
  | 'blue' 
  | 'green' 
  | 'purple' 
  | 'orange' 
  | 'amber' 
  | 'red' 
  | 'gray' 
  | 'cyan'
  | 'indigo'
  | 'pink';

interface StandardDashboardCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  colorTheme?: WidgetColorTheme;
  badge?: {
    label: string;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary';
    onClick?: () => void;
    pulse?: boolean;
  };
  navigateTo?: string;
  buttonLabel?: string;
  children?: React.ReactNode;
  className?: string;
}

const colorMap: Record<WidgetColorTheme, { border: string; icon: string; iconBg: string }> = {
  blue: {
    border: 'border-l-blue-500',
    icon: 'text-blue-600',
    iconBg: 'bg-blue-100',
  },
  green: {
    border: 'border-l-green-500',
    icon: 'text-green-600',
    iconBg: 'bg-green-100',
  },
  purple: {
    border: 'border-l-purple-500',
    icon: 'text-purple-600',
    iconBg: 'bg-purple-100',
  },
  orange: {
    border: 'border-l-orange-500',
    icon: 'text-orange-600',
    iconBg: 'bg-orange-100',
  },
  amber: {
    border: 'border-l-amber-500',
    icon: 'text-amber-600',
    iconBg: 'bg-amber-100',
  },
  red: {
    border: 'border-l-destructive',
    icon: 'text-destructive',
    iconBg: 'bg-destructive/10',
  },
  gray: {
    border: 'border-l-gray-500',
    icon: 'text-gray-600',
    iconBg: 'bg-gray-100',
  },
  cyan: {
    border: 'border-l-cyan-500',
    icon: 'text-cyan-600',
    iconBg: 'bg-cyan-100',
  },
  indigo: {
    border: 'border-l-indigo-500',
    icon: 'text-indigo-600',
    iconBg: 'bg-indigo-100',
  },
  pink: {
    border: 'border-l-pink-500',
    icon: 'text-pink-600',
    iconBg: 'bg-pink-100',
  },
};

export const StandardDashboardCard: React.FC<StandardDashboardCardProps> = ({
  title,
  value,
  description,
  icon: Icon,
  colorTheme = 'blue',
  badge,
  navigateTo,
  buttonLabel = 'View Details',
  children,
  className,
}) => {
  const navigate = useNavigate();
  const colors = colorMap[colorTheme];

  return (
    <Card
      className={cn(
        'border-l-4 transition-all hover:shadow-md bg-card h-full flex flex-col',
        colors.border,
        className
      )}
    >
      <CardContent className="p-4 flex-1 flex flex-col">
        {/* Header Row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-muted-foreground truncate">
                {title}
              </p>
              {badge && (
                <Badge
                  variant={badge.variant || 'destructive'}
                  className={cn(
                    'text-xs cursor-pointer',
                    badge.pulse && 'animate-pulse'
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    badge.onClick?.();
                  }}
                >
                  {badge.label}
                </Badge>
              )}
            </div>
            <p className="text-3xl font-bold text-foreground">{value}</p>
          </div>
          <div className={cn('p-3 rounded-full flex-shrink-0', colors.iconBg)}>
            <Icon className={cn('h-6 w-6', colors.icon)} />
          </div>
        </div>

        {/* Description */}
        {description && (
          <p className="text-xs text-muted-foreground mb-3">{description}</p>
        )}

        {/* Optional children content */}
        {children && <div className="flex-1">{children}</div>}

        {/* Action Button */}
        {navigateTo && (
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-auto"
            onClick={() => navigate(navigateTo)}
          >
            {buttonLabel}
            <ArrowRight className="ml-2 h-3 w-3" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

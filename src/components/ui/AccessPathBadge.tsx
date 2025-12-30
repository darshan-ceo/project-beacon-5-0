/**
 * AccessPathBadge Component
 * Shows how a user has access to a specific entity (case/task/client)
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { UserCheck, Users, Building2, Briefcase, Eye } from 'lucide-react';
import type { AccessPath } from '@/services/hierarchyService';

interface AccessPathBadgeProps {
  accessPath: AccessPath | null;
  compact?: boolean;
}

export const AccessPathBadge: React.FC<AccessPathBadgeProps> = ({ accessPath, compact = false }) => {
  if (!accessPath) return null;

  const config = {
    direct: {
      label: 'Direct',
      icon: UserCheck,
      variant: 'default' as const,
      className: 'bg-success/20 text-success border-success/30 hover:bg-success/30',
    },
    ownership: {
      label: 'Owner',
      icon: UserCheck,
      variant: 'default' as const,
      className: 'bg-success/20 text-success border-success/30 hover:bg-success/30',
    },
    manager: {
      label: 'Via Manager',
      icon: Users,
      variant: 'secondary' as const,
      className: 'bg-primary/20 text-primary border-primary/30 hover:bg-primary/30',
    },
    team: {
      label: 'Team',
      icon: Building2,
      variant: 'secondary' as const,
      className: 'bg-warning/20 text-warning-foreground border-warning/30 hover:bg-warning/30',
    },
    hierarchy: {
      label: 'Org',
      icon: Briefcase,
      variant: 'outline' as const,
      className: 'bg-muted text-muted-foreground',
    },
    department: {
      label: 'Dept',
      icon: Building2,
      variant: 'outline' as const,
      className: 'bg-muted text-muted-foreground',
    },
  };

  const pathConfig = config[accessPath.type] || config.hierarchy;
  const Icon = pathConfig.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={pathConfig.variant}
            className={`${pathConfig.className} cursor-help text-[10px] px-1.5 py-0.5 font-normal`}
          >
            <Icon className="h-3 w-3 mr-1" />
            {compact ? '' : pathConfig.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-xs">{accessPath.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

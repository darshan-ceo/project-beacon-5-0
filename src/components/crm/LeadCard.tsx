/**
 * LeadCard Component
 * Individual lead card for Kanban pipeline with drag support
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, ArrowRightCircle, UserCheck, Clock, IndianRupee } from 'lucide-react';
import { Lead, LEAD_SOURCE_OPTIONS } from '@/types/lead';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface LeadCardProps {
  lead: Lead;
  onView?: (lead: Lead) => void;
  onConvert?: (lead: Lead) => void;
  onDragStart?: (e: React.DragEvent, lead: Lead) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  isDragging?: boolean;
}

const getScoreConfig = (score: number) => {
  if (score >= 80) return { label: 'Hot', color: 'bg-green-100 text-green-700 border-green-200' };
  if (score >= 50) return { label: 'Warm', color: 'bg-amber-100 text-amber-700 border-amber-200' };
  if (score >= 25) return { label: 'Cool', color: 'bg-blue-100 text-blue-700 border-blue-200' };
  return { label: 'Cold', color: 'bg-gray-100 text-gray-700 border-gray-200' };
};

const formatCurrency = (value: number | null): string => {
  if (!value) return '—';
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
  return `₹${value}`;
};

export const LeadCard: React.FC<LeadCardProps> = ({
  lead,
  onView,
  onConvert,
  onDragStart,
  onDragEnd,
  isDragging,
}) => {
  const scoreConfig = getScoreConfig(lead.lead_score || 0);
  const sourceLabel = LEAD_SOURCE_OPTIONS.find(s => s.value === lead.lead_source)?.label || lead.lead_source || '—';
  
  const lastActivityText = lead.last_activity_at
    ? formatDistanceToNow(new Date(lead.last_activity_at), { addSuffix: true })
    : 'No activity';

  return (
    <Card
      className={cn(
        'cursor-grab active:cursor-grabbing hover:shadow-md transition-all',
        isDragging && 'opacity-50 shadow-lg ring-2 ring-primary'
      )}
      draggable
      onDragStart={(e) => onDragStart?.(e, lead)}
      onDragEnd={onDragEnd}
    >
      <CardContent className="p-3 space-y-2">
        {/* Header: Name + Actions */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h4 className="font-medium text-sm truncate">{lead.name}</h4>
            {lead.designation && (
              <p className="text-xs text-muted-foreground truncate">{lead.designation}</p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => onView?.(lead)}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {lead.lead_status !== 'won' && lead.lead_status !== 'lost' && (
                <DropdownMenuItem onClick={() => onConvert?.(lead)}>
                  <UserCheck className="h-4 w-4 mr-2" />
                  Convert to Client
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Badges: Source + Score */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">
            {sourceLabel}
          </Badge>
          <Badge className={cn('text-xs border', scoreConfig.color)}>
            {scoreConfig.label}
          </Badge>
        </div>

        {/* Footer: Value + Last Activity */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
          <div className="flex items-center gap-1">
            <IndianRupee className="h-3 w-3" />
            <span>{formatCurrency(lead.expected_value)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span className="truncate max-w-[80px]">{lastActivityText}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

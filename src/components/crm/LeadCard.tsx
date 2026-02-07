/**
 * LeadCard Component (Inquiry Card)
 * Individual inquiry card for Kanban pipeline with drag support
 * Simplified for legal firm context - no score/deal value
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
import { MoreHorizontal, Eye, UserCheck, Clock } from 'lucide-react';
import { Lead, LEAD_SOURCE_OPTIONS, INQUIRY_TYPE_OPTIONS } from '@/types/lead';
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

export const LeadCard: React.FC<LeadCardProps> = ({
  lead,
  onView,
  onConvert,
  onDragStart,
  onDragEnd,
  isDragging,
}) => {
  const sourceLabel = LEAD_SOURCE_OPTIONS.find(s => s.value === lead.lead_source)?.label || lead.lead_source || '—';
  const inquiryTypeLabel = INQUIRY_TYPE_OPTIONS.find(t => t.value === lead.designation)?.label || lead.designation || '';
  
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
            {inquiryTypeLabel && (
              <p className="text-xs text-muted-foreground truncate">{inquiryTypeLabel}</p>
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
              {lead.lead_status !== 'converted' && lead.lead_status !== 'not_proceeding' && (
                <DropdownMenuItem onClick={() => onConvert?.(lead)}>
                  <UserCheck className="h-4 w-4 mr-2" />
                  Onboard as Client
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Footer: Source + Last Activity */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
          <Badge variant="outline" className="text-xs">
            {sourceLabel}
          </Badge>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span className="truncate max-w-[80px]">{lastActivityText}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * LeadPipeline Component
 * Kanban board with drag-and-drop status management
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Lead, LeadStatus, LEAD_STATUS_CONFIG } from '@/types/lead';
import { LeadCard } from './LeadCard';
import { cn } from '@/lib/utils';

interface LeadPipelineProps {
  leads: Lead[];
  isLoading: boolean;
  onStatusChange: (leadId: string, newStatus: LeadStatus) => Promise<void>;
  onViewLead?: (lead: Lead) => void;
  onConvertLead?: (lead: Lead) => void;
}

const PIPELINE_STATUSES: LeadStatus[] = [
  'new',
  'follow_up',
  'converted',
  'not_proceeding',
];

const formatCurrency = (value: number): string => {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
  return `₹${value}`;
};

export const LeadPipeline: React.FC<LeadPipelineProps> = ({
  leads,
  isLoading,
  onStatusChange,
  onViewLead,
  onConvertLead,
}) => {
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<LeadStatus | null>(null);

  // Group leads by status
  const leadsByStatus = useMemo(() => {
    const grouped: Record<LeadStatus, Lead[]> = {
      new: [],
      follow_up: [],
      converted: [],
      not_proceeding: [],
    };

    leads.forEach((lead) => {
      const status = lead.lead_status as LeadStatus;
      if (status && grouped[status]) {
        grouped[status].push(lead);
      }
    });

    return grouped;
  }, [leads]);

  // Calculate column totals
  const columnTotals = useMemo(() => {
    const totals: Record<LeadStatus, { count: number; value: number }> = {} as any;
    
    PIPELINE_STATUSES.forEach((status) => {
      const statusLeads = leadsByStatus[status] || [];
      totals[status] = {
        count: statusLeads.length,
        value: statusLeads.reduce((sum, l) => sum + (l.expected_value || 0), 0),
      };
    });

    return totals;
  }, [leadsByStatus]);

  const handleDragStart = (e: React.DragEvent, lead: Lead) => {
    setDraggedLead(lead);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', lead.id);
  };

  const handleDragEnd = () => {
    setDraggedLead(null);
    setDragOverStatus(null);
  };

  const handleDragOver = (e: React.DragEvent, status: LeadStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStatus(status);
  };

  const handleDragLeave = () => {
    setDragOverStatus(null);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: LeadStatus) => {
    e.preventDefault();
    setDragOverStatus(null);

    if (draggedLead && draggedLead.lead_status !== newStatus) {
      await onStatusChange(draggedLead.id, newStatus);
    }

    setDraggedLead(null);
  };

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {PIPELINE_STATUSES.map((status) => (
          <div key={status} className="flex-shrink-0 w-[280px]">
            <Card className="h-[500px]">
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-24" />
              </CardHeader>
              <CardContent className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    );
  }

  return (
    <ScrollArea className="w-full">
      <div className="flex gap-4 pb-4 min-w-max">
        {PIPELINE_STATUSES.map((status) => {
          const config = LEAD_STATUS_CONFIG[status];
          const statusLeads = leadsByStatus[status] || [];
          const totals = columnTotals[status];
          const isDropTarget = dragOverStatus === status;

          return (
            <div
              key={status}
              className="flex-shrink-0 w-[280px]"
              onDragOver={(e) => handleDragOver(e, status)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, status)}
            >
              <Card
                className={cn(
                  'h-[calc(100vh-320px)] min-h-[400px] flex flex-col transition-all',
                  isDropTarget && 'ring-2 ring-primary ring-offset-2'
                )}
              >
                {/* Column Header */}
                <CardHeader className="pb-2 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <span className={cn('px-2 py-1 rounded text-xs', config.bgColor, config.color)}>
                        {config.label}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {totals.count}
                      </Badge>
                    </CardTitle>
                  </div>
                  {totals.value > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatCurrency(totals.value)}
                    </p>
                  )}
                </CardHeader>

                {/* Column Content */}
                <CardContent className="flex-1 overflow-hidden p-2">
                  <ScrollArea className="h-full pr-2">
                    <div className="space-y-2">
                      {statusLeads.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          No leads
                        </div>
                      ) : (
                        statusLeads.map((lead) => (
                          <LeadCard
                            key={lead.id}
                            lead={lead}
                            onView={onViewLead}
                            onConvert={onConvertLead}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                            isDragging={draggedLead?.id === lead.id}
                          />
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
};

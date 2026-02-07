/**
 * LeadTable - Table view for Inquiry Tracker
 * Displays inquiries in a sortable, responsive table format
 */

import React, { useState, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ArrowUpDown, ArrowUp, ArrowDown, Eye, UserCheck, MoreHorizontal, Phone, Mail } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Lead, LeadStatus, LEAD_STATUS_CONFIG, LEAD_SOURCE_OPTIONS } from '@/types/lead';
import { cn } from '@/lib/utils';

interface LeadTableProps {
  leads: Lead[];
  isLoading: boolean;
  onViewLead: (lead: Lead) => void;
  onConvertLead: (lead: Lead) => void;
}

type SortField = 'name' | 'lead_status' | 'lead_source' | 'last_activity_at';
type SortDirection = 'asc' | 'desc';

export const LeadTable: React.FC<LeadTableProps> = ({
  leads,
  isLoading,
  onViewLead,
  onConvertLead,
}) => {
  const [sortField, setSortField] = useState<SortField>('last_activity_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedLeads = useMemo(() => {
    return [...leads].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        case 'lead_status':
          const statusOrderA = LEAD_STATUS_CONFIG[a.lead_status as LeadStatus]?.order ?? 99;
          const statusOrderB = LEAD_STATUS_CONFIG[b.lead_status as LeadStatus]?.order ?? 99;
          comparison = statusOrderA - statusOrderB;
          break;
        case 'lead_source':
          comparison = (a.lead_source || '').localeCompare(b.lead_source || '');
          break;
        case 'last_activity_at':
          const dateA = a.last_activity_at ? new Date(a.last_activity_at).getTime() : 0;
          const dateB = b.last_activity_at ? new Date(b.last_activity_at).getTime() : 0;
          comparison = dateA - dateB;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [leads, sortField, sortDirection]);

  const getSourceLabel = (source: string | null | undefined): string => {
    if (!source) return '—';
    const found = LEAD_SOURCE_OPTIONS.find(opt => opt.value === source);
    return found?.label || source;
  };

  const getPrimaryPhone = (lead: Lead): string | null => {
    if (!lead.phones || !Array.isArray(lead.phones) || lead.phones.length === 0) return null;
    const primary = lead.phones.find(p => p.isPrimary) || lead.phones[0];
    return primary?.number || null;
  };

  const getPrimaryEmail = (lead: Lead): string | null => {
    if (!lead.emails || !Array.isArray(lead.emails) || lead.emails.length === 0) return null;
    const primary = lead.emails.find(e => e.isPrimary) || lead.emails[0];
    return primary?.email || null;
  };

  const canConvert = (status: LeadStatus | null): boolean => {
    return status !== 'converted' && status !== 'not_proceeding';
  };

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 data-[state=open]:bg-accent"
      onClick={() => handleSort(field)}
    >
      {children}
      {sortField === field ? (
        sortDirection === 'asc' ? (
          <ArrowUp className="ml-2 h-4 w-4" />
        ) : (
          <ArrowDown className="ml-2 h-4 w-4" />
        )
      ) : (
        <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
      )}
    </Button>
  );

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Party Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Source</TableHead>
              <TableHead className="hidden md:table-cell">Contact</TableHead>
              <TableHead className="hidden lg:table-cell">Last Activity</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-24 mt-1" />
                </TableCell>
                <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-32" /></TableCell>
                <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
                <TableCell><Skeleton className="h-8 w-8" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortHeader field="name">Party Name</SortHeader>
              </TableHead>
              <TableHead>
                <SortHeader field="lead_status">Status</SortHeader>
              </TableHead>
              <TableHead className="hidden sm:table-cell">
                <SortHeader field="lead_source">Source</SortHeader>
              </TableHead>
              <TableHead className="hidden md:table-cell">Contact</TableHead>
              <TableHead className="hidden lg:table-cell">
                <SortHeader field="last_activity_at">Last Activity</SortHeader>
              </TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  No inquiries found. Create a new inquiry to get started.
                </TableCell>
              </TableRow>
            ) : (
              sortedLeads.map((lead) => {
                const statusConfig = LEAD_STATUS_CONFIG[lead.lead_status as LeadStatus];
                const phone = getPrimaryPhone(lead);
                const email = getPrimaryEmail(lead);

                return (
                  <TableRow
                    key={lead.id}
                    className="cursor-pointer"
                    onClick={() => onViewLead(lead)}
                  >
                    {/* Party Name + Inquiry Type */}
                    <TableCell>
                      <div className="font-medium">{lead.name}</div>
                      {lead.designation && (
                        <div className="text-sm text-muted-foreground">{lead.designation}</div>
                      )}
                    </TableCell>

                    {/* Status Badge */}
                    <TableCell>
                      {statusConfig ? (
                        <Badge
                          variant="outline"
                          className={cn(statusConfig.bgColor, statusConfig.color, 'border-0')}
                        >
                          {statusConfig.label}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* Source */}
                    <TableCell className="hidden sm:table-cell">
                      {getSourceLabel(lead.lead_source)}
                    </TableCell>

                    {/* Contact */}
                    <TableCell className="hidden md:table-cell">
                      <div className="flex flex-col gap-1">
                        {phone && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1.5 text-sm truncate max-w-[180px]">
                                <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                <span className="truncate">{phone}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>{phone}</TooltipContent>
                          </Tooltip>
                        )}
                        {email && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1.5 text-sm truncate max-w-[180px]">
                                <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                <span className="truncate">{email}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>{email}</TooltipContent>
                          </Tooltip>
                        )}
                        {!phone && !email && (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Last Activity */}
                    <TableCell className="hidden lg:table-cell">
                      {lead.last_activity_at ? (
                        <span className="text-muted-foreground">
                          {formatDistanceToNow(new Date(lead.last_activity_at), { addSuffix: true })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">No activity</span>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            onViewLead(lead);
                          }}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          {canConvert(lead.lead_status) && (
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              onConvertLead(lead);
                            }}>
                              <UserCheck className="mr-2 h-4 w-4" />
                              Onboard as Client
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
};

export default LeadTable;

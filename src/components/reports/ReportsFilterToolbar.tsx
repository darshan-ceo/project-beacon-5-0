import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CalendarIcon, ChevronDown, ChevronUp, X, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { getStageOptionsWithAliases } from '@/utils/stageUtils';
import { ReportType, ReportFilter } from '@/types/reports';
import { useAppState } from '@/contexts/AppStateContext';

interface ReportsFilterToolbarProps {
  reportType: ReportType;
  filters: ReportFilter;
  onFiltersChange: (filters: ReportFilter) => void;
  userRole: 'Admin' | 'Partner/CA' | 'Staff' | 'Client';
  defaultCollapsed?: boolean;
}

export const ReportsFilterToolbar: React.FC<ReportsFilterToolbarProps> = ({
  reportType,
  filters,
  onFiltersChange,
  userRole,
  defaultCollapsed = true
}) => {
  const [isExpanded, setIsExpanded] = useState(!defaultCollapsed);
  const [startDate, setStartDate] = useState<Date | undefined>(
    filters.dateRange?.start ? new Date(filters.dateRange.start) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    filters.dateRange?.end ? new Date(filters.dateRange.end) : undefined
  );

  // Get actual data from AppStateContext
  const { state } = useAppState();

  const clients = state.clients
    .filter(c => c.status === 'Active')
    .map(c => ({ value: c.id, label: c.name || 'Unknown' }));

  const stages = getStageOptionsWithAliases();

  const courts = state.courts
    .filter(c => c.status === 'Active')
    .map(c => ({ value: c.id, label: c.name }));

  const employees = state.employees
    .filter(e => e.status === 'Active')
    .map(e => ({ value: e.id, label: e.full_name || 'Unknown' }));

  const priorities = [
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' }
  ];

  const ragStatuses = [
    { value: 'Green', label: 'Green' },
    { value: 'Amber', label: 'Amber' },
    { value: 'Red', label: 'Red' }
  ];

  const taskStatuses = [
    { value: 'open', label: 'Open' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'overdue', label: 'Overdue' }
  ];

  const communicationChannels = [
    { value: 'Email', label: 'Email' },
    { value: 'SMS', label: 'SMS' },
    { value: 'WhatsApp', label: 'WhatsApp' }
  ];

  const communicationStatuses = [
    { value: 'sent', label: 'Sent' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'failed', label: 'Failed' },
    { value: 'pending', label: 'Pending' }
  ];

  const formTypes = [
    { value: 'ASMT10_REPLY', label: 'ASMT-10' },
    { value: 'DRC1A_REPLY', label: 'DRC-1A' },
    { value: 'DRC01_REPLY', label: 'DRC-01' },
    { value: 'APL01_FIRST_APPEAL', label: 'APL-01' }
  ];

  const formTimelineStatuses = [
    { value: 'on-time', label: 'On Time' },
    { value: 'delayed', label: 'Delayed' },
    { value: 'pending', label: 'Pending' }
  ];

  const updateFilters = useCallback((updates: Partial<ReportFilter>) => {
    const newFilters = { ...filters, ...updates };
    onFiltersChange(newFilters);
  }, [filters, onFiltersChange]);

  const handleDateRangeChange = (start?: Date, end?: Date) => {
    setStartDate(start);
    setEndDate(end);
    
    if (start && end) {
      updateFilters({
        dateRange: {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0]
        }
      });
    } else {
      const { dateRange, ...rest } = filters;
      onFiltersChange(rest);
    }
  };

  const clearAllFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    onFiltersChange({});
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.dateRange) count++;
    if (filters.clientId) count++;
    if (filters.stage) count++;
    if (filters.priority) count++;
    if (filters.ragStatus) count++;
    if (filters.courtId) count++;
    if (filters.ownerId) count++;
    if (filters.assigneeId) count++;
    if (filters.status) count++;
    if (filters.channel) count++;
    return count;
  };

  const removeFilter = (filterKey: keyof ReportFilter) => {
    const { [filterKey]: _, ...rest } = filters;
    if (filterKey === 'dateRange') {
      setStartDate(undefined);
      setEndDate(undefined);
    }
    onFiltersChange(rest);
  };

  const getFilterLabel = (key: string, value: any) => {
    switch (key) {
      case 'dateRange':
        return `${format(new Date(value.start), 'MMM d')} - ${format(new Date(value.end), 'MMM d')}`;
      case 'clientId':
        return clients.find(c => c.value === value)?.label || value;
      case 'stage':
        return stages.find(s => s.value === value)?.label || value;
      case 'priority':
        return priorities.find(p => p.value === value)?.label || value;
      case 'ragStatus':
        return `RAG: ${value}`;
      case 'courtId':
        return courts.find(c => c.value === value)?.label || value;
      case 'ownerId':
        return employees.find(e => e.value === value)?.label || value;
      case 'assigneeId':
        return employees.find(e => e.value === value)?.label || value;
      case 'status':
        return value;
      case 'channel':
        return value;
      default:
        return value;
    }
  };

  const quickDatePresets = [
    {
      label: 'Today',
      getValue: () => {
        const today = new Date();
        return { start: today, end: today };
      }
    },
    {
      label: 'Last 7 days',
      getValue: () => {
        const today = new Date();
        const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        return { start: lastWeek, end: today };
      }
    },
    {
      label: 'Last 30 days',
      getValue: () => {
        const today = new Date();
        const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        return { start: lastMonth, end: today };
      }
    },
    {
      label: 'This Month',
      getValue: () => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        return { start: firstDay, end: today };
      }
    }
  ];

  const renderReportSpecificFilters = () => {
    switch (reportType) {
      case 'case-reports':
        return (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Stage</Label>
              <Select value={filters.stage || 'all'} onValueChange={(value) => updateFilters({ stage: value === 'all' ? undefined : value })}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All stages</SelectItem>
                  {stages.map(stage => (
                    <SelectItem key={stage.value} value={stage.value}>{stage.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">RAG Status</Label>
              <Select value={filters.ragStatus || 'all'} onValueChange={(value) => updateFilters({ ragStatus: value === 'all' ? undefined : value as any })}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {ragStatuses.map(status => (
                    <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Priority</Label>
              <Select value={filters.priority || 'all'} onValueChange={(value) => updateFilters({ priority: value === 'all' ? undefined : value })}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  {priorities.map(priority => (
                    <SelectItem key={priority.value} value={priority.value}>{priority.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        );

      case 'hearings':
        return (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Court</Label>
              <Select value={filters.courtId || 'all'} onValueChange={(value) => updateFilters({ courtId: value === 'all' ? undefined : value })}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All courts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All courts</SelectItem>
                  {courts.map(court => (
                    <SelectItem key={court.value} value={court.value}>{court.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Judge</Label>
              <Input
                placeholder="Search judge..."
                value={filters.judgeId || ''}
                onChange={(e) => updateFilters({ judgeId: e.target.value || undefined })}
                className="h-9"
              />
            </div>
          </>
        );

      case 'tasks':
        return (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Status</Label>
              <Select value={filters.status || 'all'} onValueChange={(value) => updateFilters({ status: value === 'all' ? undefined : value })}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {taskStatuses.map(status => (
                    <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Assignee</Label>
              <Select value={filters.assigneeId || 'all'} onValueChange={(value) => updateFilters({ assigneeId: value === 'all' ? undefined : value })}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All assignees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All assignees</SelectItem>
                  {employees.map(emp => (
                    <SelectItem key={emp.value} value={emp.value}>{emp.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Priority</Label>
              <Select value={filters.priority || 'all'} onValueChange={(value) => updateFilters({ priority: value === 'all' ? undefined : value })}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  {priorities.map(priority => (
                    <SelectItem key={priority.value} value={priority.value}>{priority.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        );

      case 'communications':
        return (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Channel</Label>
              <Select value={filters.channel || 'all'} onValueChange={(value) => updateFilters({ channel: value === 'all' ? undefined : value as any })}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All channels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All channels</SelectItem>
                  {communicationChannels.map(channel => (
                    <SelectItem key={channel.value} value={channel.value}>{channel.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Delivery Status</Label>
              <Select value={filters.status || 'all'} onValueChange={(value) => updateFilters({ status: value === 'all' ? undefined : value })}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {communicationStatuses.map(status => (
                    <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        );

      case 'form-timeline':
        return (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Form Type</Label>
              <Select value={filters.caseId || 'all'} onValueChange={(value) => updateFilters({ caseId: value === 'all' ? undefined : value })}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All forms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All forms</SelectItem>
                  {formTypes.map(form => (
                    <SelectItem key={form.value} value={form.value}>{form.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Timeline Status</Label>
              <Select value={filters.status || 'all'} onValueChange={(value) => updateFilters({ status: value === 'all' ? undefined : value })}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {formTimelineStatuses.map(status => (
                    <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">RAG Status</Label>
              <Select value={filters.ragStatus || 'all'} onValueChange={(value) => updateFilters({ ragStatus: value === 'all' ? undefined : value as any })}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All RAG statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {ragStatuses.map(status => (
                    <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className="border-b border-border bg-muted/20 sticky top-0 z-10">
        {/* Collapsed State - Always Visible */}
        <div className="px-2 sm:px-4 py-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-2">
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                <span className="font-medium text-sm">Filters</span>
                {getActiveFilterCount() > 0 && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    {getActiveFilterCount()}
                  </Badge>
                )}
              </Button>
            </CollapsibleTrigger>

            {/* Active Filter Chips */}
            {!isExpanded && getActiveFilterCount() > 0 && (
              <div className="flex items-center gap-2 flex-wrap max-w-full overflow-x-auto">
                {Object.entries(filters).map(([key, value]) => {
                  if (!value) return null;
                  return (
                    <Badge
                      key={key}
                      variant="outline"
                      className="h-7 px-2 gap-1.5 bg-background"
                    >
                      <span className="text-xs">{getFilterLabel(key, value)}</span>
                      <button
                        onClick={() => removeFilter(key as keyof ReportFilter)}
                        className="hover:bg-muted rounded-sm"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {getActiveFilterCount() > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-8 gap-1.5"
              >
                <RotateCcw className="h-3 w-3" />
                <span className="text-xs">Clear All</span>
              </Button>
            )}
          </div>
        </div>

        {/* Expanded State - Collapsible */}
        <CollapsibleContent className="animate-accordion-down">
          <div className="px-2 sm:px-4 py-4 border-t border-border bg-background">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {/* Date Range Filter */}
              <div className="space-y-1.5 lg:col-span-2">
                <Label className="text-xs font-medium text-muted-foreground">Date Range</Label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "flex-1 justify-start text-left font-normal h-9",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        <span className="text-xs">
                          {startDate ? format(startDate, "MMM d, yyyy") : "Start"}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(date) => handleDateRangeChange(date, endDate)}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "flex-1 justify-start text-left font-normal h-9",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        <span className="text-xs">
                          {endDate ? format(endDate, "MMM d, yyyy") : "End"}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={(date) => handleDateRangeChange(startDate, date)}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                {/* Quick Presets */}
                <div className="flex gap-1 flex-wrap">
                  {quickDatePresets.map((preset) => (
                    <Button
                      key={preset.label}
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => {
                        const { start, end } = preset.getValue();
                        handleDateRangeChange(start, end);
                      }}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Client Filter */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Client</Label>
                <Select value={filters.clientId || 'all'} onValueChange={(value) => updateFilters({ clientId: value === 'all' ? undefined : value })}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All clients" />
                  </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All clients</SelectItem>
                {clients.map(client => (
                  <SelectItem key={client.value} value={client.value}>{client.label}</SelectItem>
                ))}
              </SelectContent>
                </Select>
              </div>

              {/* Owner Filter */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Owner</Label>
                <Select value={filters.ownerId || 'all'} onValueChange={(value) => updateFilters({ ownerId: value === 'all' ? undefined : value })}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All owners" />
                  </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All owners</SelectItem>
                {employees.map(emp => (
                  <SelectItem key={emp.value} value={emp.value}>{emp.label}</SelectItem>
                ))}
              </SelectContent>
                </Select>
              </div>

              {/* Report-Specific Filters */}
              {renderReportSpecificFilters()}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

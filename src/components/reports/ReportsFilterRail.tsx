import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Filter, X, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

import { ReportType, ReportFilter } from '@/types/reports';

interface ReportsFilterRailProps {
  reportType: ReportType;
  filters: ReportFilter;
  onFiltersChange: (filters: ReportFilter) => void;
  userRole: 'Admin' | 'Partner/CA' | 'Staff' | 'Client';
}

export const ReportsFilterRail: React.FC<ReportsFilterRailProps> = ({
  reportType,
  filters,
  onFiltersChange,
  userRole
}) => {
  const [startDate, setStartDate] = useState<Date | undefined>(
    filters.dateRange?.start ? new Date(filters.dateRange.start) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    filters.dateRange?.end ? new Date(filters.dateRange.end) : undefined
  );

  // Mock data for filter options
  const mockClients = [
    { value: 'abc-pvt-ltd', label: 'ABC Pvt Ltd' },
    { value: 'xyz-corp', label: 'XYZ Corp' },
    { value: 'global-enterprises', label: 'Global Enterprises' },
    { value: 'tech-solutions', label: 'Tech Solutions' },
    { value: 'legal-associates', label: 'Legal Associates' }
  ];

  const mockStages = [
    { value: 'filing', label: 'Filing' },
    { value: 'notice', label: 'Notice' },
    { value: 'evidence', label: 'Evidence' },
    { value: 'arguments', label: 'Arguments' },
    { value: 'judgment', label: 'Judgment' },
    { value: 'appeal', label: 'Appeal' }
  ];

  const mockCourts = [
    { value: 'high-court', label: 'High Court' },
    { value: 'district-court', label: 'District Court' },
    { value: 'sessions-court', label: 'Sessions Court' },
    { value: 'magistrate-court', label: 'Magistrate Court' }
  ];

  const mockEmployees = [
    { value: 'john-smith', label: 'Adv. John Smith' },
    { value: 'sarah-johnson', label: 'Adv. Sarah Johnson' },
    { value: 'michael-brown', label: 'Adv. Michael Brown' },
    { value: 'emily-davis', label: 'Adv. Emily Davis' }
  ];

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

  const renderReportSpecificFilters = () => {
    switch (reportType) {
      case 'case-reports':
        return (
          <>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Stage</Label>
              <Select value={filters.stage || ''} onValueChange={(value) => updateFilters({ stage: value || undefined })}>
                <SelectTrigger>
                  <SelectValue placeholder="All stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All stages</SelectItem>
                  {mockStages.map(stage => (
                    <SelectItem key={stage.value} value={stage.value}>{stage.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">SLA Status</Label>
              <Select value={filters.ragStatus || ''} onValueChange={(value) => updateFilters({ ragStatus: value as any || undefined })}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  {ragStatuses.map(status => (
                    <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        );

      case 'hearings':
        return (
          <>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Court</Label>
              <Select value={filters.courtId || ''} onValueChange={(value) => updateFilters({ courtId: value || undefined })}>
                <SelectTrigger>
                  <SelectValue placeholder="All courts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All courts</SelectItem>
                  {mockCourts.map(court => (
                    <SelectItem key={court.value} value={court.value}>{court.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Judge</Label>
              <Input
                placeholder="Search judge..."
                value={filters.judgeId || ''}
                onChange={(e) => updateFilters({ judgeId: e.target.value || undefined })}
              />
            </div>
          </>
        );

      case 'tasks':
        return (
          <>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Status</Label>
              <Select value={filters.status || ''} onValueChange={(value) => updateFilters({ status: value || undefined })}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  {taskStatuses.map(status => (
                    <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Assignee</Label>
              <Select value={filters.assigneeId || ''} onValueChange={(value) => updateFilters({ assigneeId: value || undefined })}>
                <SelectTrigger>
                  <SelectValue placeholder="All assignees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All assignees</SelectItem>
                  {mockEmployees.map(emp => (
                    <SelectItem key={emp.value} value={emp.value}>{emp.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        );

      case 'communications':
        return (
          <>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Channel</Label>
              <Select value={filters.channel || ''} onValueChange={(value) => updateFilters({ channel: value as any || undefined })}>
                <SelectTrigger>
                  <SelectValue placeholder="All channels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All channels</SelectItem>
                  {communicationChannels.map(channel => (
                    <SelectItem key={channel.value} value={channel.value}>{channel.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Delivery Status</Label>
              <Select value={filters.status || ''} onValueChange={(value) => updateFilters({ status: value || undefined })}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  {communicationStatuses.map(status => (
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
    <div className="h-full p-4 space-y-6 overflow-y-auto">
      {/* Filter Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          <h3 className="font-medium text-foreground">Filters</h3>
          {getActiveFilterCount() > 0 && (
            <Badge variant="secondary" className="text-xs">
              {getActiveFilterCount()}
            </Badge>
          )}
        </div>
        {getActiveFilterCount() > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-auto p-1"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Date Range</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "flex-1 justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : "Start date"}
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
          </div>

          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "flex-1 justify-start text-left font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP") : "End date"}
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

          {/* Quick Date Presets */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const today = new Date();
                const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                handleDateRangeChange(lastWeek, today);
              }}
            >
              Last 7 days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const today = new Date();
                const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                handleDateRangeChange(lastMonth, today);
              }}
            >
              Last 30 days
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Common Filters */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-foreground">General Filters</h4>

        {/* Client Filter */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Client</Label>
          <Select value={filters.clientId || ''} onValueChange={(value) => updateFilters({ clientId: value || undefined })}>
            <SelectTrigger>
              <SelectValue placeholder="All clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All clients</SelectItem>
              {mockClients.map(client => (
                <SelectItem key={client.value} value={client.value}>{client.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Priority Filter */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Priority</Label>
          <Select value={filters.priority || ''} onValueChange={(value) => updateFilters({ priority: value || undefined })}>
            <SelectTrigger>
              <SelectValue placeholder="All priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All priorities</SelectItem>
              {priorities.map(priority => (
                <SelectItem key={priority.value} value={priority.value}>{priority.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Owner Filter */}
        {userRole === 'Admin' && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Owner</Label>
            <Select value={filters.ownerId || ''} onValueChange={(value) => updateFilters({ ownerId: value || undefined })}>
              <SelectTrigger>
                <SelectValue placeholder="All owners" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All owners</SelectItem>
                {mockEmployees.map(emp => (
                  <SelectItem key={emp.value} value={emp.value}>{emp.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <Separator />

      {/* Report-Specific Filters */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-foreground">Specific Filters</h4>
        {renderReportSpecificFilters()}
      </div>

      {/* Active Filters Summary */}
      {getActiveFilterCount() > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">Active Filters</h4>
            <div className="flex flex-wrap gap-1">
              {filters.dateRange && (
                <Badge variant="secondary" className="text-xs">
                  Date Range
                  <button
                    onClick={() => handleDateRangeChange(undefined, undefined)}
                    className="ml-1 hover:bg-secondary-foreground/20 rounded-sm"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filters.clientId && (
                <Badge variant="secondary" className="text-xs">
                  Client
                  <button
                    onClick={() => updateFilters({ clientId: undefined })}
                    className="ml-1 hover:bg-secondary-foreground/20 rounded-sm"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filters.stage && (
                <Badge variant="secondary" className="text-xs">
                  Stage
                  <button
                    onClick={() => updateFilters({ stage: undefined })}
                    className="ml-1 hover:bg-secondary-foreground/20 rounded-sm"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filters.priority && (
                <Badge variant="secondary" className="text-xs">
                  Priority
                  <button
                    onClick={() => updateFilters({ priority: undefined })}
                    className="ml-1 hover:bg-secondary-foreground/20 rounded-sm"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
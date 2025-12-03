import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExternalLink, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UrgentDeadline } from '@/services/complianceDashboardService';

interface UrgentDeadlinesTableProps {
  data: UrgentDeadline[];
}

type FilterType = 'all' | 'overdue' | 'today' | 'thisWeek' | 'upcoming';

const filterOptions: { value: FilterType; label: string; count?: number }[] = [
  { value: 'all', label: 'All' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Today' },
  { value: 'thisWeek', label: 'This Week' },
  { value: 'upcoming', label: 'Upcoming' },
];

const statusConfig = {
  overdue: { label: 'Overdue', variant: 'destructive' as const, className: 'bg-destructive text-destructive-foreground' },
  today: { label: 'Due Today', variant: 'destructive' as const, className: 'bg-red-500 text-white' },
  tomorrow: { label: 'Tomorrow', variant: 'default' as const, className: 'bg-orange-500 text-white' },
  thisWeek: { label: 'This Week', variant: 'secondary' as const, className: 'bg-amber-500 text-white' },
  upcoming: { label: 'Upcoming', variant: 'outline' as const, className: 'bg-green-500/20 text-green-700' },
};

export const UrgentDeadlinesTable: React.FC<UrgentDeadlinesTableProps> = ({ data }) => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const filteredData = useMemo(() => {
    if (activeFilter === 'all') return data;
    if (activeFilter === 'thisWeek') {
      return data.filter((d) => d.status === 'thisWeek' || d.status === 'tomorrow');
    }
    return data.filter((d) => d.status === activeFilter);
  }, [data, activeFilter]);

  const filterCounts = useMemo(() => {
    return {
      all: data.length,
      overdue: data.filter((d) => d.status === 'overdue').length,
      today: data.filter((d) => d.status === 'today').length,
      thisWeek: data.filter((d) => d.status === 'thisWeek' || d.status === 'tomorrow').length,
      upcoming: data.filter((d) => d.status === 'upcoming').length,
    };
  }, [data]);

  const getRowClassName = (status: UrgentDeadline['status']) => {
    switch (status) {
      case 'overdue':
        return 'bg-destructive/5 hover:bg-destructive/10';
      case 'today':
        return 'bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30';
      case 'tomorrow':
        return 'bg-orange-50 dark:bg-orange-950/20 hover:bg-orange-100 dark:hover:bg-orange-950/30';
      case 'thisWeek':
        return 'bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-950/30';
      default:
        return 'hover:bg-muted/50';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Urgent Deadlines
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            {filteredData.length} of {data.length} deadlines
          </span>
        </div>
        {/* Filter Tabs */}
        <div className="flex items-center gap-1 mt-3 flex-wrap">
          {filterOptions.map((filter) => (
            <Button
              key={filter.value}
              variant={activeFilter === filter.value ? 'default' : 'outline'}
              size="sm"
              className={cn(
                'h-7 text-xs gap-1',
                activeFilter === filter.value && 'shadow-sm'
              )}
              onClick={() => setActiveFilter(filter.value)}
            >
              {filter.label}
              <Badge 
                variant="secondary" 
                className={cn(
                  'ml-1 h-4 px-1 text-[10px]',
                  activeFilter === filter.value 
                    ? 'bg-primary-foreground/20 text-primary-foreground' 
                    : 'bg-muted'
                )}
              >
                {filterCounts[filter.value]}
              </Badge>
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Case Number</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Authority</TableHead>
                <TableHead>Event Type</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-center">Days</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {activeFilter === 'all' 
                      ? 'No urgent deadlines found. All caught up!' 
                      : `No ${filterOptions.find(f => f.value === activeFilter)?.label.toLowerCase()} deadlines`
                    }
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((deadline) => {
                  const config = statusConfig[deadline.status];
                  return (
                    <TableRow 
                      key={deadline.id}
                      className={cn('transition-colors', getRowClassName(deadline.status))}
                    >
                      <TableCell className="font-medium">{deadline.caseNumber}</TableCell>
                      <TableCell>{deadline.clientName}</TableCell>
                      <TableCell>{deadline.authorityLevel}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{deadline.eventTypeName}</TableCell>
                      <TableCell>
                        {new Date(deadline.dueDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          'font-semibold',
                          deadline.daysRemaining < 0 && 'text-destructive',
                          deadline.daysRemaining === 0 && 'text-red-600',
                          deadline.daysRemaining > 0 && deadline.daysRemaining <= 3 && 'text-orange-600',
                        )}>
                          {deadline.daysRemaining < 0 
                            ? `${Math.abs(deadline.daysRemaining)}d overdue`
                            : deadline.daysRemaining === 0 
                              ? 'Today'
                              : `${deadline.daysRemaining}d`
                          }
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={config.className}>
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/cases?id=${deadline.caseId}`)}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

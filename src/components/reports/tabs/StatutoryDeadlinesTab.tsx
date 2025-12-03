import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ExportButton } from '@/components/ui/export-button';
import { getStatutoryDeadlineReport } from '@/services/reportsService';
import { ReportFilter, StatutoryDeadlineReportData } from '@/types/reports';
import { format } from 'date-fns';

interface StatutoryDeadlinesTabProps {
  filters: ReportFilter;
  userRole: string;
  onFiltersChange: (filters: ReportFilter) => void;
}

export const StatutoryDeadlinesTab: React.FC<StatutoryDeadlinesTabProps> = ({ filters }) => {
  const [data, setData] = useState<StatutoryDeadlineReportData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const result = await getStatutoryDeadlineReport(filters);
        setData(result.data);
      } catch (error) {
        console.error('Failed to load statutory deadline reports:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [filters]);

  const getRagBadgeVariant = (status: string) => {
    switch (status) {
      case 'Green': return 'default';
      case 'Amber': return 'secondary';
      case 'Red': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Completed': return 'default';
      case 'Pending': return 'secondary';
      case 'Breached': return 'destructive';
      case 'Extended': return 'outline';
      default: return 'outline';
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      return format(new Date(dateStr), 'dd MMM yyyy');
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  // Summary stats
  const breachedCount = data.filter(d => d.status === 'Breached' || d.ragStatus === 'Red').length;
  const pendingCount = data.filter(d => d.status === 'Pending').length;
  const completedCount = data.filter(d => d.status === 'Completed').length;
  const urgentCount = data.filter(d => d.daysRemaining <= 7 && d.daysRemaining > 0).length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-medium">Statutory Deadlines ({data.length})</h3>
          <div className="flex gap-2">
            <Badge variant="destructive" className="text-xs">
              {breachedCount} Breached
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {urgentCount} Urgent
            </Badge>
            <Badge variant="outline" className="text-xs">
              {pendingCount} Pending
            </Badge>
            <Badge variant="default" className="text-xs">
              {completedCount} Completed
            </Badge>
          </div>
        </div>
        <ExportButton
          data={data}
          filename="statutory-deadlines"
          type="statutory-deadlines"
        />
      </div>
      
      <div className="flex-1 overflow-auto">
        <div className="overflow-x-auto">
          <Table className="min-w-[1200px]">
            <TableHeader>
              <TableRow>
                <TableHead>Case Number</TableHead>
                <TableHead>Case Title</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Event Type</TableHead>
                <TableHead>Act</TableHead>
                <TableHead>Base Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Days Left</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>RAG</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="text-right">Extensions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center text-muted-foreground py-8">
                    No statutory deadlines found matching the filters
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item) => (
                  <TableRow key={item.id} className={item.ragStatus === 'Red' ? 'bg-destructive/5' : ''}>
                    <TableCell className="font-medium">{item.caseNumber}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{item.caseTitle}</TableCell>
                    <TableCell>{item.client}</TableCell>
                    <TableCell>{item.eventType}</TableCell>
                    <TableCell className="text-xs">{item.actName}</TableCell>
                    <TableCell>{formatDate(item.baseDate)}</TableCell>
                    <TableCell>{formatDate(item.dueDate)}</TableCell>
                    <TableCell className="text-right">
                      <span className={item.daysRemaining < 0 ? 'text-destructive font-medium' : item.daysRemaining <= 7 ? 'text-orange-600 font-medium' : ''}>
                        {item.daysRemaining}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(item.status)}>
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRagBadgeVariant(item.ragStatus)}>
                        {item.ragStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.owner}</TableCell>
                    <TableCell className="text-right">{item.extensionCount}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

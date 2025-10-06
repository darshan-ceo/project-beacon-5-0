import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ExportButton } from '@/components/ui/export-button';
import { getTimelineBreachReport } from '@/services/reportsService';
import { ReportFilter, TimelineBreachReportData } from '@/types/reports';

interface TimelineBreachTabProps {
  filters: ReportFilter;
  userRole: string;
  onFiltersChange: (filters: ReportFilter) => void;
}

export const TimelineBreachTab: React.FC<TimelineBreachTabProps> = ({ filters }) => {
  const [data, setData] = useState<TimelineBreachReportData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const result = await getTimelineBreachReport(filters);
        setData(result.data);
      } catch (error) {
        console.error('Failed to load timeline breach reports:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [filters]);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-medium">Timeline Breaches / Compliance ({data.length})</h3>
        <ExportButton
          data={data}
          filename="timeline-breach-compliance"
          type="sla-compliance"
        />
      </div>
      
      <div className="flex-1 overflow-auto">
        <div className="overflow-x-auto">
          <Table className="min-w-[1000px]">
            <TableHeader>
            <TableRow>
              <TableHead>Case ID</TableHead>
              <TableHead>Case Title</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Timeline Due</TableHead>
              <TableHead>Aging Days</TableHead>
              <TableHead>RAG Status</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Breached</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.caseId}>
                <TableCell className="font-medium">{item.caseId}</TableCell>
                <TableCell>{item.caseTitle}</TableCell>
                <TableCell>{item.client}</TableCell>
                <TableCell>{item.stage}</TableCell>
                <TableCell>{item.timelineDue}</TableCell>
                <TableCell>{item.agingDays}</TableCell>
                <TableCell>
                  <Badge variant={item.ragStatus === 'Green' ? 'default' : item.ragStatus === 'Amber' ? 'secondary' : 'destructive'}>
                    {item.ragStatus}
                  </Badge>
                </TableCell>
                <TableCell>{item.owner}</TableCell>
                <TableCell>
                  <Badge variant={item.breached ? 'destructive' : 'default'}>
                    {item.breached ? 'Yes' : 'No'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};
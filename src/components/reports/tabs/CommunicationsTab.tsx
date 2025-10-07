import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ExportButton } from '@/components/ui/export-button';
import { getCommunicationReport } from '@/services/reportsService';
import { ReportFilter, CommunicationReportData } from '@/types/reports';
import { formatDateForDisplay } from '@/utils/dateFormatters';

interface CommunicationsTabProps {
  filters: ReportFilter;
  userRole: string;
  onFiltersChange: (filters: ReportFilter) => void;
}

export const CommunicationsTab: React.FC<CommunicationsTabProps> = ({ filters }) => {
  const [data, setData] = useState<CommunicationReportData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const result = await getCommunicationReport(filters);
        setData(result.data);
      } catch (error) {
        console.error('Failed to load communication reports:', error);
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

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-16 h-16 mb-4 rounded-full bg-muted flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground"
          >
            <path d="M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 .8-1.6l8-6a2 2 0 0 1 2.4 0l8 6Z" />
            <path d="m22 10-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 10" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold mb-2">Communication Tracking Coming Soon</h3>
        <p className="text-muted-foreground max-w-md">
          Communication tracking and reporting will be available in a future update. This feature will allow you to track emails, messages, and other communications with clients and stakeholders.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-medium">Communications ({data.length})</h3>
        <ExportButton
          data={data}
          filename="communications-report"
          type="communications"
        />
      </div>
      
      <div className="flex-1 overflow-auto">
        <div className="overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Case ID</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Template</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{formatDateForDisplay(item.date)}</TableCell>
                <TableCell className="font-medium">{item.caseId}</TableCell>
                <TableCell>{item.client}</TableCell>
                <TableCell>
                  <Badge variant="outline">{item.channel}</Badge>
                </TableCell>
                <TableCell className="truncate max-w-[200px]">{item.to}</TableCell>
                <TableCell>
                  <Badge variant={item.status === 'Delivered' ? 'default' : item.status === 'Failed' ? 'destructive' : 'secondary'}>
                    {item.status}
                  </Badge>
                </TableCell>
                <TableCell>{item.template}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ExportButton } from '@/components/ui/export-button';
import { getCommunicationReport } from '@/services/reportsService';
import { ReportFilter, CommunicationReportData } from '@/types/reports';

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
        <Table>
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
                <TableCell>{item.date}</TableCell>
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
  );
};
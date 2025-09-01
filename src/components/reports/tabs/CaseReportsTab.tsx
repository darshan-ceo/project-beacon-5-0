import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ExportButton } from '@/components/ui/export-button';
import { getCaseReport } from '@/services/reportsService';
import { ReportFilter, CaseReportData } from '@/types/reports';

interface CaseReportsTabProps {
  filters: ReportFilter;
  userRole: string;
  onFiltersChange: (filters: ReportFilter) => void;
}

export const CaseReportsTab: React.FC<CaseReportsTabProps> = ({ filters }) => {
  const [data, setData] = useState<CaseReportData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const result = await getCaseReport(filters);
        setData(result.data);
      } catch (error) {
        console.error('Failed to load case reports:', error);
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
        <h3 className="text-lg font-medium">Case Reports ({data.length})</h3>
        <ExportButton
          data={data}
          filename="case-reports"
          type="case-reports"
        />
      </div>
      
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Case ID</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>SLA Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Aging Days</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.id}</TableCell>
                <TableCell>{item.title}</TableCell>
                <TableCell>{item.client}</TableCell>
                <TableCell>{item.stage}</TableCell>
                <TableCell>{item.owner}</TableCell>
                <TableCell>
                  <Badge variant={item.slaStatus === 'Green' ? 'default' : item.slaStatus === 'Amber' ? 'secondary' : 'destructive'}>
                    {item.slaStatus}
                  </Badge>
                </TableCell>
                <TableCell>{item.priority}</TableCell>
                <TableCell>{item.agingDays}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
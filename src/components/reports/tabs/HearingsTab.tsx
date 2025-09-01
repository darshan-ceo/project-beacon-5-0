import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ExportButton } from '@/components/ui/export-button';
import { getHearingReport } from '@/services/reportsService';
import { ReportFilter, HearingReportData } from '@/types/reports';

interface HearingsTabProps {
  filters: ReportFilter;
  userRole: string;
  onFiltersChange: (filters: ReportFilter) => void;
}

export const HearingsTab: React.FC<HearingsTabProps> = ({ filters }) => {
  const [data, setData] = useState<HearingReportData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const result = await getHearingReport(filters);
        setData(result.data);
      } catch (error) {
        console.error('Failed to load hearing reports:', error);
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
        <h3 className="text-lg font-medium">Hearings & Cause List ({data.length})</h3>
        <ExportButton
          data={data}
          filename="hearings-report"
          type="hearings"
        />
      </div>
      
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Case ID</TableHead>
              <TableHead>Case Title</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Court</TableHead>
              <TableHead>Judge</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.date}</TableCell>
                <TableCell>{item.time}</TableCell>
                <TableCell className="font-medium">{item.caseId}</TableCell>
                <TableCell>{item.caseTitle}</TableCell>
                <TableCell>{item.client}</TableCell>
                <TableCell>{item.court}</TableCell>
                <TableCell>{item.judge}</TableCell>
                <TableCell>
                  <Badge variant={item.status === 'Scheduled' ? 'default' : 'secondary'}>
                    {item.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
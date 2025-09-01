import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ExportButton } from '@/components/ui/export-button';
import { getClientReport } from '@/services/reportsService';
import { ReportFilter, ClientReportData } from '@/types/reports';

interface ClientSummaryTabProps {
  filters: ReportFilter;
  userRole: string;
  onFiltersChange: (filters: ReportFilter) => void;
}

export const ClientSummaryTab: React.FC<ClientSummaryTabProps> = ({ filters }) => {
  const [data, setData] = useState<ClientReportData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const result = await getClientReport(filters);
        setData(result.data);
      } catch (error) {
        console.error('Failed to load client reports:', error);
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
        <h3 className="text-lg font-medium">Client Summary ({data.length})</h3>
        <ExportButton
          data={data}
          filename="client-summary"
          type="client-summary"
        />
      </div>
      
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Total Cases</TableHead>
              <TableHead>Active Cases</TableHead>
              <TableHead>SLA Breaches</TableHead>
              <TableHead>Next Hearing</TableHead>
              <TableHead>Total Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.id}</TableCell>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.totalCases}</TableCell>
                <TableCell>{item.activeCases}</TableCell>
                <TableCell>{item.slaBreaches}</TableCell>
                <TableCell>{item.nextHearing}</TableCell>
                <TableCell>₹{item.totalValue?.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
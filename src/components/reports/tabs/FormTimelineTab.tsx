import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ExportButton } from '@/components/ui/export-button';
import { getFormTimelineReport } from '@/services/reportsService';
import { ReportFilter, FormTimelineReportData } from '@/types/reports';
import { FileCheck2 } from 'lucide-react';

interface FormTimelineTabProps {
  filters: ReportFilter;
  userRole: string;
  onFiltersChange: (filters: ReportFilter) => void;
}

export const FormTimelineTab: React.FC<FormTimelineTabProps> = ({ filters }) => {
  const [data, setData] = useState<FormTimelineReportData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const result = await getFormTimelineReport(filters);
        setData(result.data);
      } catch (error) {
        console.error('Failed to load form timeline reports:', error);
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
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <FileCheck2 className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-medium text-foreground">
            Form Timeline Performance ({data.length} forms)
          </h3>
        </div>
        <ExportButton
          data={data}
          filename="form-timeline-report"
          type="form-timeline"
        />
      </div>
      
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Form Code</TableHead>
              <TableHead>Form Title</TableHead>
              <TableHead>Case Number</TableHead>
              <TableHead>Case Title</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Submission Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Days Elapsed</TableHead>
              <TableHead>RAG Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                  No form submissions found for the selected filters
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-sm">{item.formCode}</TableCell>
                  <TableCell className="font-medium">{item.formTitle}</TableCell>
                  <TableCell>{item.caseNumber}</TableCell>
                  <TableCell className="max-w-xs truncate">{item.caseTitle}</TableCell>
                  <TableCell>{item.client}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.stage}</Badge>
                  </TableCell>
                  <TableCell>
                    {item.submissionDate ? (
                      new Date(item.submissionDate).toLocaleDateString('en-IN')
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.dueDate ? (
                      new Date(item.dueDate).toLocaleDateString('en-IN')
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        item.status === 'On Time' ? 'default' : 
                        item.status === 'Delayed' ? 'destructive' : 
                        'secondary'
                      }
                    >
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{item.daysElapsed}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        item.ragStatus === 'Green' ? 'default' : 
                        item.ragStatus === 'Red' ? 'destructive' : 
                        'secondary'
                      }
                      className={
                        item.ragStatus === 'Green' ? 'bg-green-500/10 text-green-700 border-green-500/20' :
                        item.ragStatus === 'Amber' ? 'bg-amber-500/10 text-amber-700 border-amber-500/20' :
                        ''
                      }
                    >
                      {item.ragStatus}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

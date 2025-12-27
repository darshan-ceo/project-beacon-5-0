import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ExportButton } from '@/components/ui/export-button';
import { getTaskReport } from '@/services/reportsService';
import { ReportFilter, TaskReportData } from '@/types/reports';
import { Building2, User, CalendarPlus } from 'lucide-react';
import { useAppState } from '@/contexts/AppStateContext';
import { formatDateForDisplay } from '@/utils/dateFormatters';

interface TasksTabProps {
  filters: ReportFilter;
  userRole: string;
  onFiltersChange: (filters: ReportFilter) => void;
}

export const TasksTab: React.FC<TasksTabProps> = ({ filters }) => {
  const { state } = useAppState();
  const [data, setData] = useState<TaskReportData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const result = await getTaskReport(filters);
        setData(result.data);
      } catch (error) {
        console.error('Failed to load task reports:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [filters]);

  // Helper function to get client name from task's case
  const getClientName = (caseId: string) => {
    const taskCase = state.cases.find(c => c.id === caseId);
    if (taskCase) {
      const client = state.clients.find(cl => cl.id === taskCase.clientId);
      return client?.name || 'Unknown Client';
    }
    return 'Unknown Client';
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-medium">Task & Escalation ({data.length})</h3>
        <ExportButton
          data={data}
          filename="tasks-report"
          type="tasks"
        />
      </div>
      
      <div className="flex-1 overflow-auto">
        <div className="overflow-x-auto">
          <Table className="min-w-[1000px]">
            <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Task Title</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Created Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Escalated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">{item.client || getClientName(item.caseId)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span>{item.owner || 'Unassigned'}</span>
                  </div>
                </TableCell>
                <TableCell className="font-medium">{item.title}</TableCell>
                <TableCell>{item.assignee}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <CalendarPlus className="h-3 w-3 text-muted-foreground" />
                    <span>{item.createdDate ? formatDateForDisplay(item.createdDate) : '-'}</span>
                  </div>
                </TableCell>
                <TableCell>{item.dueDate}</TableCell>
                <TableCell>
                  <Badge variant={item.status === 'Completed' ? 'default' : item.status === 'Overdue' ? 'destructive' : 'secondary'}>
                    {item.status}
                  </Badge>
                </TableCell>
                <TableCell>{item.priority}</TableCell>
                <TableCell>
                  <Badge variant={item.escalated ? 'destructive' : 'default'}>
                    {item.escalated ? 'Yes' : 'No'}
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
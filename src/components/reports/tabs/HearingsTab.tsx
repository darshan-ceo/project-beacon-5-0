import React, { useState, useEffect, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ExportButton } from '@/components/ui/export-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getHearingReport } from '@/services/reportsService';
import { ReportFilter, HearingReportData } from '@/types/reports';
import { formatDateForDisplay, formatTimeForDisplay } from '@/utils/dateFormatters';
import { format } from 'date-fns';
import { getOfficerLabel } from '@/types/officer-designation';

interface HearingsTabProps {
  filters: ReportFilter;
  userRole: string;
  onFiltersChange: (filters: ReportFilter) => void;
}

type GroupByOption = 'none' | 'authority' | 'forum' | 'advocate' | 'month' | 'taxJurisdiction';
type SortByOption = 'date' | 'case' | 'authority' | 'outcome' | 'taxJurisdiction';

export const HearingsTab: React.FC<HearingsTabProps> = ({ filters }) => {
  const [data, setData] = useState<HearingReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState<GroupByOption>('none');
  const [sortBy, setSortBy] = useState<SortByOption>('date');

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

  // Sort data
  const sortedData = useMemo(() => {
    const sorted = [...data];
    sorted.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'case':
          return (a.caseId || '').localeCompare(b.caseId || '');
        case 'authority':
          return (a.authority || '').localeCompare(b.authority || '');
        case 'outcome':
          return (a.outcome || '').localeCompare(b.outcome || '');
        case 'taxJurisdiction':
          return (a.taxJurisdiction || '').localeCompare(b.taxJurisdiction || '');
        default:
          return 0;
      }
    });
    return sorted;
  }, [data, sortBy]);

  // Group data
  const groupedData = useMemo(() => {
    if (groupBy === 'none') {
      return { 'All Hearings': sortedData };
    }

    const groups: Record<string, HearingReportData[]> = {};

    sortedData.forEach(item => {
      let groupKey = 'Unknown';

      switch (groupBy) {
        case 'authority':
          groupKey = item.authority || 'No Authority';
          break;
        case 'forum':
          groupKey = item.court || 'No Forum';
          break;
        case 'advocate':
          groupKey = item.advocate || 'No Advocate';
          break;
        case 'month':
          groupKey = format(new Date(item.date), 'MMMM yyyy');
          break;
        case 'taxJurisdiction':
          groupKey = item.taxJurisdiction || 'No Jurisdiction';
          break;
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
    });

    return groups;
  }, [sortedData, groupBy]);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const renderTable = (items: HearingReportData[]) => (
    <Table className="min-w-[1100px]">
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Time</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Owner</TableHead>
          <TableHead>Case Title</TableHead>
          <TableHead>Legal Forum</TableHead>
          <TableHead>Tax Jurisdiction</TableHead>
          <TableHead>Officer Designation</TableHead>
          <TableHead>Judge</TableHead>
          <TableHead>Outcome</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell>{formatDateForDisplay(item.date)}</TableCell>
            <TableCell>{formatTimeForDisplay(item.time)}</TableCell>
            <TableCell>{item.client}</TableCell>
            <TableCell>{item.owner}</TableCell>
            <TableCell>{item.caseTitle}</TableCell>
            <TableCell>{item.court}</TableCell>
            <TableCell>
              {item.taxJurisdiction && (
                <Badge variant={item.taxJurisdiction === 'CGST' ? 'default' : 'secondary'}>
                  {item.taxJurisdiction}
                </Badge>
              )}
            </TableCell>
            <TableCell>
              {item.officerDesignation ? getOfficerLabel(item.officerDesignation as any) : 'N/A'}
            </TableCell>
            <TableCell>{item.judge}</TableCell>
            <TableCell>
              {item.outcome && (
                <Badge variant="outline">{item.outcome}</Badge>
              )}
            </TableCell>
            <TableCell>
              <Badge variant={item.status === 'Scheduled' ? 'default' : 'secondary'}>
                {item.status}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header with Controls */}
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Hearings & Cause List ({data.length})</h3>
          <ExportButton
            data={data}
            filename="hearings-report"
            type="hearings"
          />
        </div>

        {/* Group By and Sort Controls */}
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-sm mb-2 block">Group By</Label>
            <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupByOption)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Grouping</SelectItem>
                <SelectItem value="authority">Authority</SelectItem>
                <SelectItem value="forum">Legal Forum</SelectItem>
                <SelectItem value="advocate">Advocate</SelectItem>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="taxJurisdiction">Tax Jurisdiction</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <Label className="text-sm mb-2 block">Sort By</Label>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortByOption)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="case">Case Number</SelectItem>
                <SelectItem value="authority">Authority</SelectItem>
                <SelectItem value="outcome">Outcome</SelectItem>
                <SelectItem value="taxJurisdiction">Tax Jurisdiction</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      {/* Grouped Tables */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {Object.entries(groupedData).map(([group, items]) => (
          <div key={group}>
            {groupBy !== 'none' && (
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>{group}</span>
                    <Badge variant="secondary">{items.length} hearing(s)</Badge>
                  </CardTitle>
                </CardHeader>
              </Card>
            )}
            <div className="overflow-x-auto">
              {renderTable(items)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { X, Download, RefreshCw, Settings } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Hearing } from '@/types/hearings';
import { format } from 'date-fns';
import { formatDateForDisplay, formatTimeForDisplay } from '@/utils/dateFormatters';

interface CalendarSyncErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  failedHearings: (Hearing & { case_number?: string; case_title?: string })[];
  onRetry: (hearingId: string) => Promise<void>;
  onRetryAll: () => Promise<void>;
  onOpenSettings: () => void;
}

type ErrorCategory = 'all' | 'auth' | 'rate_limit' | 'network' | 'other';

export const CalendarSyncErrorModal: React.FC<CalendarSyncErrorModalProps> = ({
  isOpen,
  onClose,
  failedHearings,
  onRetry,
  onRetryAll,
  onOpenSettings
}) => {
  const [errorFilter, setErrorFilter] = useState<ErrorCategory>('all');
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());
  const [isRetryingAll, setIsRetryingAll] = useState(false);

  const categorizeError = (error?: string): ErrorCategory => {
    if (!error) return 'other';
    const lowerError = error.toLowerCase();
    
    if (lowerError.includes('auth') || lowerError.includes('token') || lowerError.includes('expired')) {
      return 'auth';
    }
    if (lowerError.includes('rate') || lowerError.includes('limit') || lowerError.includes('quota')) {
      return 'rate_limit';
    }
    if (lowerError.includes('network') || lowerError.includes('connect') || lowerError.includes('timeout')) {
      return 'network';
    }
    return 'other';
  };

  const filteredHearings = useMemo(() => {
    if (errorFilter === 'all') return failedHearings;
    return failedHearings.filter(h => categorizeError(h.syncError) === errorFilter);
  }, [failedHearings, errorFilter]);

  const errorCategoryCounts = useMemo(() => {
    const counts = { all: failedHearings.length, auth: 0, rate_limit: 0, network: 0, other: 0 };
    failedHearings.forEach(h => {
      const category = categorizeError(h.syncError);
      counts[category]++;
    });
    return counts;
  }, [failedHearings]);

  const handleRetry = async (hearingId: string) => {
    setRetryingIds(prev => new Set(prev).add(hearingId));
    try {
      await onRetry(hearingId);
    } finally {
      setRetryingIds(prev => {
        const next = new Set(prev);
        next.delete(hearingId);
        return next;
      });
    }
  };

  const handleRetryAll = async () => {
    setIsRetryingAll(true);
    try {
      await onRetryAll();
    } finally {
      setIsRetryingAll(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Case Number', 'Case Title', 'Date', 'Time', 'Error Type', 'Error Message'];
    const rows = filteredHearings.map(h => [
      h.case_number || '',
      h.case_title || '',
      h.date,
      h.start_time,
      categorizeError(h.syncError),
      h.syncError || ''
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calendar-sync-errors-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getErrorBadgeColor = (category: ErrorCategory) => {
    switch (category) {
      case 'auth': return 'bg-red-100 text-red-800 border-red-200';
      case 'rate_limit': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'network': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Failed Calendar Syncs ({failedHearings.length})</DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Select value={errorFilter} onValueChange={(v) => setErrorFilter(v as ErrorCategory)}>
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="Filter by error type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Errors ({errorCategoryCounts.all})</SelectItem>
                <SelectItem value="auth">Authentication ({errorCategoryCounts.auth})</SelectItem>
                <SelectItem value="rate_limit">Rate Limit ({errorCategoryCounts.rate_limit})</SelectItem>
                <SelectItem value="network">Network ({errorCategoryCounts.network})</SelectItem>
                <SelectItem value="other">Other ({errorCategoryCounts.other})</SelectItem>
              </SelectContent>
            </Select>

            <Button size="sm" variant="outline" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Case</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Error Type</TableHead>
                    <TableHead>Error Message</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHearings.map((hearing) => {
                    const category = categorizeError(hearing.syncError);
                    const isRetrying = retryingIds.has(hearing.id);
                    
                    return (
                      <TableRow key={hearing.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium text-sm">{hearing.case_number}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {hearing.case_title}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{formatDateForDisplay(hearing.date)}</TableCell>
                        <TableCell>{formatTimeForDisplay(hearing.start_time)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getErrorBadgeColor(category)}>
                            {category.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <p className="text-xs text-muted-foreground max-w-[300px] truncate">
                            {hearing.syncError}
                          </p>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRetry(hearing.id)}
                            disabled={isRetrying}
                          >
                            <RefreshCw className={`h-3 w-3 ${isRetrying ? 'animate-spin' : ''}`} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {errorCategoryCounts.auth > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                <strong>{errorCategoryCounts.auth} authentication error(s) detected.</strong>{' '}
                Your calendar access may have expired. Please reconnect your calendar.
              </p>
            </div>
          )}
        </DialogBody>

        <DialogFooter className="gap-3">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {errorCategoryCounts.auth > 0 && (
            <Button variant="destructive" onClick={onOpenSettings}>
              <Settings className="h-4 w-4 mr-2" />
              Reconnect Calendar
            </Button>
          )}
          <Button onClick={handleRetryAll} disabled={isRetryingAll}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRetryingAll ? 'animate-spin' : ''}`} />
            {isRetryingAll ? 'Retrying All...' : 'Retry All'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

import React from 'react';
import { Calendar, CheckCircle2, XCircle, AlertCircle, ChevronRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Hearing } from '@/types/hearings';

interface CalendarSyncStatsCardProps {
  hearings: Hearing[];
  onViewErrors: () => void;
  onRetryFailed: () => void;
}

export const CalendarSyncStatsCard: React.FC<CalendarSyncStatsCardProps> = ({
  hearings,
  onViewErrors,
  onRetryFailed
}) => {
  const stats = hearings.reduce(
    (acc, h) => {
      const status = h.syncStatus || 'not_synced';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const syncedCount = stats.synced || 0;
  const failedCount = stats.sync_failed || 0;
  const notSyncedCount = stats.not_synced || 0;
  const totalCount = hearings.length;
  const syncRate = totalCount > 0 ? Math.round((syncedCount / totalCount) * 100) : 0;

  if (totalCount === 0) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-4 w-4" />
          Calendar Sync Summary
          <Badge variant="outline" className="ml-auto">
            {syncRate}% synced
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-green-600 mb-1" />
            <span className="text-2xl font-bold text-green-900">{syncedCount}</span>
            <span className="text-xs text-green-700">Synced</span>
          </div>

          <div className="flex flex-col items-center p-3 bg-red-50 border border-red-200 rounded-lg">
            <XCircle className="h-5 w-5 text-red-600 mb-1" />
            <span className="text-2xl font-bold text-red-900">{failedCount}</span>
            <span className="text-xs text-red-700">Failed</span>
          </div>

          <div className="flex flex-col items-center p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-amber-600 mb-1" />
            <span className="text-2xl font-bold text-amber-900">{notSyncedCount}</span>
            <span className="text-xs text-amber-700">Not Synced</span>
          </div>
        </div>

        {failedCount > 0 && (
          <div className="flex gap-2 pt-2 border-t">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={onViewErrors}
            >
              View Errors
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
            <Button
              size="sm"
              variant="default"
              className="flex-1"
              onClick={onRetryFailed}
            >
              Retry Failed ({failedCount})
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

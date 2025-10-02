import React, { useState } from 'react';
import { Calendar, ExternalLink, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarSyncBadge } from './CalendarSyncBadge';
import { Hearing } from '@/types/hearings';
import { CalendarIntegrationSettings } from '@/services/integrationsService';
import { formatDistanceToNow } from 'date-fns';

interface CalendarSyncPanelProps {
  hearing: Hearing;
  settings?: CalendarIntegrationSettings;
  onRetrySync?: () => Promise<void>;
}

export const CalendarSyncPanel: React.FC<CalendarSyncPanelProps> = ({
  hearing,
  settings,
  onRetrySync
}) => {
  const [isRetrying, setIsRetrying] = useState(false);

  if (!settings || settings.provider === 'none') {
    return null;
  }

  const handleRetrySync = async () => {
    if (!onRetrySync) return;
    
    setIsRetrying(true);
    try {
      await onRetrySync();
    } finally {
      setIsRetrying(false);
    }
  };

  const getCalendarUrl = () => {
    if (!hearing.externalEventId) return null;
    
    if (settings.provider === 'google') {
      return `https://calendar.google.com/calendar/event?eid=${hearing.externalEventId}`;
    } else if (settings.provider === 'outlook') {
      return `https://outlook.office.com/calendar/item/${hearing.externalEventId}`;
    }
    
    return null;
  };

  const calendarUrl = getCalendarUrl();
  const status = hearing.syncStatus || 'not_synced';
  const canRetry = status === 'sync_failed' || status === 'not_synced';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-4 w-4" />
          Calendar Sync Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Provider:</span>
            <span className="font-medium">
              {settings.provider === 'google' ? 'Google Calendar' : 'Outlook Calendar'}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Status:</span>
            <CalendarSyncBadge
              status={status}
              error={hearing.syncError}
              lastSyncAt={hearing.lastSyncAt}
              provider={settings.provider}
            />
          </div>

          {hearing.externalEventId && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Event ID:</span>
              <span className="text-xs font-mono text-muted-foreground truncate max-w-[200px]">
                {hearing.externalEventId.substring(0, 20)}...
              </span>
            </div>
          )}

          {hearing.lastSyncAt && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Last Sync:</span>
              <span className="text-sm">
                {formatDistanceToNow(new Date(hearing.lastSyncAt), { addSuffix: true })}
              </span>
            </div>
          )}

          {hearing.syncError && (
            <div className="pt-2 border-t">
              <p className="text-xs text-destructive">{hearing.syncError}</p>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2 border-t">
          {calendarUrl && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => window.open(calendarUrl, '_blank')}
            >
              <ExternalLink className="h-3 w-3 mr-2" />
              View in Calendar
            </Button>
          )}
          
          {canRetry && onRetrySync && (
            <Button
              size="sm"
              variant={status === 'sync_failed' ? 'default' : 'outline'}
              className="flex-1"
              onClick={handleRetrySync}
              disabled={isRetrying}
            >
              <RefreshCw className={`h-3 w-3 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
              {isRetrying ? 'Retrying...' : 'Retry Sync'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

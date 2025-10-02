import React from 'react';
import { CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';

interface CalendarSyncBadgeProps {
  status: 'synced' | 'not_synced' | 'sync_failed' | 'sync_pending';
  error?: string;
  lastSyncAt?: string;
  provider?: string;
}

export const CalendarSyncBadge: React.FC<CalendarSyncBadgeProps> = ({
  status,
  error,
  lastSyncAt,
  provider
}) => {
  const getBadgeConfig = () => {
    switch (status) {
      case 'synced':
        return {
          icon: CheckCircle2,
          label: 'Synced',
          variant: 'default' as const,
          className: 'bg-green-100 text-green-800 hover:bg-green-100 border-green-200'
        };
      case 'sync_failed':
        return {
          icon: XCircle,
          label: 'Sync Failed',
          variant: 'destructive' as const,
          className: 'bg-destructive/10 text-destructive hover:bg-destructive/10 border-destructive/20'
        };
      case 'sync_pending':
        return {
          icon: Clock,
          label: 'Syncing...',
          variant: 'secondary' as const,
          className: 'bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200'
        };
      case 'not_synced':
      default:
        return {
          icon: AlertCircle,
          label: 'Not Synced',
          variant: 'outline' as const,
          className: 'bg-amber-50 text-amber-800 hover:bg-amber-50 border-amber-200'
        };
    }
  };

  const config = getBadgeConfig();
  const Icon = config.icon;

  const getTooltipContent = () => {
    const parts = [];
    
    if (provider) {
      parts.push(`Provider: ${provider === 'google' ? 'Google Calendar' : 'Outlook'}`);
    }
    
    if (status === 'synced' && lastSyncAt) {
      parts.push(`Last synced: ${formatDistanceToNow(new Date(lastSyncAt), { addSuffix: true })}`);
    }
    
    if (status === 'sync_failed' && error) {
      parts.push(`Error: ${error}`);
    }
    
    if (status === 'not_synced') {
      parts.push('This hearing has not been synced to your calendar');
    }
    
    return parts.join('\n');
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={config.variant} className={`gap-1 ${config.className}`}>
            <Icon className="h-3 w-3" />
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs whitespace-pre-line">
          {getTooltipContent()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

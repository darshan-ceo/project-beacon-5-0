/**
 * LeadActivityTimeline
 * Chronological feed of all lead interactions
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Phone,
  Mail,
  Users,
  StickyNote,
  CheckSquare,
  ArrowRightCircle,
  UserCheck,
  Calendar,
  Loader2,
} from 'lucide-react';
import { leadService } from '@/services/leadService';
import { LeadActivity, ActivityType } from '@/types/lead';
import { cn } from '@/lib/utils';

interface LeadActivityTimelineProps {
  contactId: string;
  className?: string;
}

const ACTIVITY_ICONS: Record<ActivityType, React.ElementType> = {
  call: Phone,
  email: Mail,
  meeting: Users,
  note: StickyNote,
  task: CheckSquare,
  status_change: ArrowRightCircle,
  conversion: UserCheck,
};

const ACTIVITY_COLORS: Record<ActivityType, string> = {
  call: 'bg-green-100 text-green-700',
  email: 'bg-blue-100 text-blue-700',
  meeting: 'bg-purple-100 text-purple-700',
  note: 'bg-amber-100 text-amber-700',
  task: 'bg-cyan-100 text-cyan-700',
  status_change: 'bg-gray-100 text-gray-700',
  conversion: 'bg-emerald-100 text-emerald-700',
};

export const LeadActivityTimeline: React.FC<LeadActivityTimelineProps> = ({
  contactId,
  className,
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const { data: activitiesResponse, isLoading } = useQuery({
    queryKey: ['lead-activities', contactId],
    queryFn: () => leadService.getActivities(contactId),
    enabled: !!contactId,
  });

  const activities = activitiesResponse?.data || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <StickyNote className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No activities yet</p>
        <p className="text-xs mt-1">Log your first interaction with this lead</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {activities.map((activity, index) => {
        const Icon = ACTIVITY_ICONS[activity.activity_type] || StickyNote;
        const colorClass = ACTIVITY_COLORS[activity.activity_type] || 'bg-gray-100 text-gray-700';

        return (
          <div key={activity.id} className="relative flex gap-3">
            {/* Timeline connector */}
            {index < activities.length - 1 && (
              <div className="absolute left-4 top-8 bottom-0 w-px bg-border -translate-x-1/2" />
            )}

            {/* Icon */}
            <div
              className={cn(
                'flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center',
                colorClass
              )}
            >
              <Icon className="h-4 w-4" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pb-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-sm">
                  {activity.subject || activity.activity_type.replace('_', ' ')}
                </p>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                </span>
              </div>

              {activity.description && (
                <div>
                  <p className={cn(
                    "text-sm text-muted-foreground mt-1",
                    !expandedIds.has(activity.id) && "line-clamp-2"
                  )}>
                    {activity.description}
                  </p>
                  {activity.description.length > 100 && (
                    <button
                      onClick={() => toggleExpand(activity.id)}
                      className="text-xs text-primary hover:underline mt-1"
                    >
                      {expandedIds.has(activity.id) ? 'Show less' : 'Show more'}
                    </button>
                  )}
                </div>
              )}

              {activity.outcome && (
                <p className="text-sm mt-1">
                  <span className="text-muted-foreground">Outcome:</span> {activity.outcome}
                </p>
              )}

              {activity.next_action && (
                <div className="mt-2 flex items-center gap-2 text-xs bg-amber-50 text-amber-800 px-2 py-1 rounded-md w-fit">
                  <Calendar className="h-3 w-3" />
                  <span>Next: {activity.next_action}</span>
                  {activity.next_action_date && (
                    <span className="text-amber-600">
                      by {format(new Date(activity.next_action_date), 'MMM d')}
                    </span>
                  )}
                </div>
              )}

              <p className="text-xs text-muted-foreground mt-1">
                by {activity.created_by_name || 'Unknown'}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default LeadActivityTimeline;

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, ExternalLink, CalendarDays } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRBAC } from '@/hooks/useAdvancedRBAC';
import { useUpcomingHearings } from '@/hooks/useUpcomingHearings';
import { HearingMiniCalendarItem } from './HearingMiniCalendarItem';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  HEARING_MINI_CALENDAR_CONFIG, 
  FILTER_OPTIONS 
} from '@/config/hearingMiniCalendar';
import { motion } from 'framer-motion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface HearingMiniCalendarProps {
  className?: string;
}

export const HearingMiniCalendar: React.FC<HearingMiniCalendarProps> = ({ className }) => {
  const navigate = useNavigate();
  const { currentUser } = useRBAC();
  const [filter, setFilter] = useState<string>('my-cases');
  const [isLoading] = useState(false);

  // Responsive limit based on screen size
  const [limit, setLimit] = useState<number>(HEARING_MINI_CALENDAR_CONFIG.DESKTOP_LIMIT);

  useEffect(() => {
    const updateLimit = () => {
      if (window.innerWidth < 768) {
        setLimit(HEARING_MINI_CALENDAR_CONFIG.MOBILE_LIMIT);
      } else if (window.innerWidth < 1024) {
        setLimit(HEARING_MINI_CALENDAR_CONFIG.TABLET_LIMIT);
      } else {
        setLimit(HEARING_MINI_CALENDAR_CONFIG.DESKTOP_LIMIT);
      }
    };

    updateLimit();
    window.addEventListener('resize', updateLimit);
    return () => window.removeEventListener('resize', updateLimit);
  }, []);

  const upcomingHearings = useUpcomingHearings({
    filter: filter as any,
    limit,
    currentUserId: currentUser.id,
    teamMemberIds: [], // TODO: Get from user's team
  });

  const handleViewFullCalendar = () => {
    // Preserve filter in query params
    const filterParam = filter !== 'all' ? `?filter=${filter}` : '';
    navigate(`/hearings${filterParam}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className={className}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Upcoming Hearings
            </CardTitle>
            Next scheduled legal forum appearances
          </div>
          
          {/* Top-right actions */}
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[140px] h-8">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FILTER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleViewFullCalendar}
              aria-label="View full calendar"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Loading State */}
          {isLoading && (
            <div className="space-y-3">
              {Array.from({ length: limit }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && upcomingHearings.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-sm font-medium text-muted-foreground mb-2">
                No upcoming hearings
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                You're all caught up! No hearings scheduled.
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleViewFullCalendar}
              >
                Open Full Calendar
              </Button>
            </div>
          )}

          {/* Hearings List */}
          {!isLoading && upcomingHearings.length > 0 && (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 scroll-smooth">
              {upcomingHearings.map((hearing) => (
                <HearingMiniCalendarItem
                  key={hearing.id}
                  hearing={hearing}
                  showClient={HEARING_MINI_CALENDAR_CONFIG.SHOW_CLIENT}
                  showAssignee={HEARING_MINI_CALENDAR_CONFIG.SHOW_ASSIGNEE}
                />
              ))}
            </div>
          )}

          {/* Footer: "See all" link */}
          {upcomingHearings.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <Button 
                variant="link" 
                size="sm"
                onClick={handleViewFullCalendar}
                className="w-full text-xs"
              >
                View All Hearings →
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

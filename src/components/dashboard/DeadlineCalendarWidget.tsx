/**
 * Deadline Calendar Mini Widget
 * Shows a compact calendar view of upcoming statutory deadlines
 */

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, ArrowRight, Clock } from 'lucide-react';
import { useDeadlineNotifications } from '@/hooks/useDeadlineNotifications';
import { format, parseISO, startOfWeek, addDays, isSameDay } from 'date-fns';

export const DeadlineCalendarWidget: React.FC = () => {
  const navigate = useNavigate();
  const { pendingDeadlines, stats } = useDeadlineNotifications();
  
  // Get the current week days
  const weekDays = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday start
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, []);

  // Group deadlines by date
  const deadlinesByDate = useMemo(() => {
    const map = new Map<string, number>();
    pendingDeadlines.forEach(deadline => {
      try {
        const date = format(parseISO(deadline.dueDate), 'yyyy-MM-dd');
        map.set(date, (map.get(date) || 0) + 1);
      } catch {
        // Skip invalid dates
      }
    });
    return map;
  }, [pendingDeadlines]);

  const getDeadlineCount = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return deadlinesByDate.get(dateStr) || 0;
  };

  const getDayStyle = (date: Date) => {
    const count = getDeadlineCount(date);
    const isToday = isSameDay(date, new Date());
    
    if (count > 0) {
      return `bg-destructive/20 text-destructive font-bold ${isToday ? 'ring-2 ring-primary' : ''}`;
    }
    if (isToday) {
      return 'bg-primary/20 text-primary font-bold ring-2 ring-primary';
    }
    return 'text-muted-foreground';
  };

  return (
    <Card className="hover:shadow-lg transition-shadow bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          Deadline Calendar
        </CardTitle>
        <Badge variant="outline" className="text-xs">
          {stats.thisWeek} this week
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Mini Calendar Week View */}
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((day, index) => (
              <div key={index} className="text-center">
                <div className="text-xs text-muted-foreground mb-1">
                  {format(day, 'EEE').charAt(0)}
                </div>
                <div 
                  className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center text-xs cursor-pointer hover:bg-muted transition-colors ${getDayStyle(day)}`}
                  onClick={() => {
                    const count = getDeadlineCount(day);
                    if (count > 0) {
                      navigate(`/statutory-acts?date=${format(day, 'yyyy-MM-dd')}`);
                    }
                  }}
                >
                  {format(day, 'd')}
                  {getDeadlineCount(day) > 0 && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full text-[8px] text-white flex items-center justify-center">
                      {getDeadlineCount(day)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs pt-2 border-t">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-primary/20 ring-1 ring-primary" />
              <span className="text-muted-foreground">Today</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-destructive/20" />
              <span className="text-muted-foreground">Has deadline</span>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex justify-between items-center p-2 rounded-lg bg-background/60">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Total upcoming</span>
            </div>
            <Badge variant="secondary">{stats.total}</Badge>
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={() => navigate('/statutory-acts')}
          >
            Full Calendar View
            <ArrowRight className="ml-2 h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { UrgentDeadline } from '@/services/complianceDashboardService';

interface ComplianceCalendarMiniProps {
  deadlines: UrgentDeadline[];
  onDateClick?: (date: Date) => void;
}

export const ComplianceCalendarMini: React.FC<ComplianceCalendarMiniProps> = ({
  deadlines,
  onDateClick,
}) => {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());

  const deadlinesByDate = useMemo(() => {
    const map = new Map<string, { count: number; status: string }>();
    deadlines.forEach((d) => {
      const dateKey = d.dueDate.split('T')[0];
      const existing = map.get(dateKey);
      if (existing) {
        existing.count++;
        // Prioritize worst status
        if (d.status === 'overdue' || existing.status !== 'overdue') {
          existing.status = d.status;
        }
      } else {
        map.set(dateKey, { count: 1, status: d.status });
      }
    });
    return map;
  }, [deadlines]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];

    // Add empty days for padding
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    // Add actual days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const days = getDaysInMonth(currentMonth);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getDateStatus = (date: Date) => {
    const dateKey = date.toISOString().split('T')[0];
    return deadlinesByDate.get(dateKey);
  };

  const getDayClassName = (date: Date | null) => {
    if (!date) return 'invisible';
    
    const status = getDateStatus(date);
    const isToday = date.getTime() === today.getTime();
    
    let className = 'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors cursor-pointer hover:bg-muted';
    
    if (isToday) {
      className += ' ring-2 ring-primary ring-offset-1';
    }
    
    if (status) {
      switch (status.status) {
        case 'overdue':
          className += ' bg-destructive text-destructive-foreground';
          break;
        case 'today':
          className += ' bg-red-500 text-white';
          break;
        case 'tomorrow':
          className += ' bg-orange-500 text-white';
          break;
        case 'thisWeek':
          className += ' bg-amber-500 text-white';
          break;
        default:
          className += ' bg-green-500/20 text-green-700';
      }
    }
    
    return className;
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Deadline Calendar
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {currentMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
        </p>
      </CardHeader>
      <CardContent>
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
            <div key={i} className="w-8 h-6 flex items-center justify-center text-xs font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>
        
        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((date, i) => (
            <div
              key={i}
              className={getDayClassName(date)}
              onClick={() => date && onDateClick?.(date)}
            >
              {date?.getDate()}
              {date && getDateStatus(date) && getDateStatus(date)!.count > 1 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary text-[8px] rounded-full flex items-center justify-center text-primary-foreground">
                  {getDateStatus(date)!.count}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t">
          <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/30">Overdue</Badge>
          <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-500/30">Today</Badge>
          <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">This Week</Badge>
          <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">Upcoming</Badge>
        </div>
      </CardContent>
    </Card>
  );
};

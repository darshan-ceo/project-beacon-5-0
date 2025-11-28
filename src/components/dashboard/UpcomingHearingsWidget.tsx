import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '@/contexts/AppStateContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, ArrowRight, Clock } from 'lucide-react';
import { format, parseISO, isAfter, isBefore, addDays } from 'date-fns';

export const UpcomingHearingsWidget: React.FC = () => {
  const { state } = useAppState();
  const navigate = useNavigate();
  
  const now = new Date();
  const weekFromNow = addDays(now, 7);
  
  // Calculate all upcoming hearings (without slice) for correct count
  const allUpcomingHearings = state.hearings
    .filter(h => {
      try {
        const hearingDate = parseISO(h.date);
        return isAfter(hearingDate, now) && isBefore(hearingDate, weekFromNow);
      } catch {
        return false;
      }
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // Display only first 3 hearings in widget
  const upcomingHearings = allUpcomingHearings.slice(0, 3);
  
  const todayHearings = state.hearings.filter(h => {
    try {
      const hearingDate = parseISO(h.date);
      const today = new Date();
      return format(hearingDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
    } catch {
      return false;
    }
  });
  
  return (
    <Card className="hover:shadow-lg transition-shadow bg-gradient-to-br from-violet-50 to-indigo-50 h-full flex flex-col overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 h-[60px]">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          Upcoming Hearings
        </CardTitle>
        {todayHearings.length > 0 && (
          <Badge 
            variant="default" 
            className="animate-pulse cursor-pointer hover:bg-primary/80 transition-colors"
            onClick={() => navigate('/hearings?dateRange=today')}
          >
            {todayHearings.length} today
          </Badge>
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="space-y-3 flex-1">
          <div className="text-2xl font-bold text-foreground">
            {allUpcomingHearings.length}
          </div>
          <p className="text-xs text-muted-foreground">
            Hearings in the next 7 days
          </p>
          
          {upcomingHearings.length > 0 && (
            <div className="space-y-2 mt-3 pt-3 border-t">
              {upcomingHearings.map(hearing => {
                const caseInfo = state.cases.find(c => c.id === hearing.case_id);
                return (
                  <div key={hearing.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{caseInfo?.caseNumber || 'Unknown'}</span>
                    </div>
                    <span className="text-muted-foreground flex-shrink-0 ml-2">
                      {format(parseISO(hearing.date), 'MMM dd')}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full mt-4"
          onClick={() => navigate('/hearings?dateRange=next7days')}
        >
          View Calendar
          <ArrowRight className="ml-2 h-3 w-3" />
        </Button>
      </CardContent>
    </Card>
  );
};

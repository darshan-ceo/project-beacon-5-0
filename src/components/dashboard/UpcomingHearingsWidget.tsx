import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '@/contexts/AppStateContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, ArrowRight, Clock } from 'lucide-react';
import { format, parseISO, isAfter, isBefore, addDays } from 'date-fns';

export const UpcomingHearingsWidget: React.FC = () => {
  const { state } = useAppState();
  const navigate = useNavigate();
  
  const now = new Date();
  const weekFromNow = addDays(now, 7);
  
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
    <Card className="hover:shadow-md transition-shadow border-l-4 border-l-indigo-500 h-full flex flex-col">
      <CardContent className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-muted-foreground">Upcoming Hearings</p>
              {todayHearings.length > 0 && (
                <Badge 
                  variant="default" 
                  className="text-xs animate-pulse cursor-pointer"
                  onClick={() => navigate('/hearings?dateRange=today')}
                >
                  {todayHearings.length} today
                </Badge>
              )}
            </div>
            <p className="text-3xl font-bold text-foreground">{allUpcomingHearings.length}</p>
          </div>
          <div className="p-3 rounded-full bg-indigo-100 flex-shrink-0">
            <Calendar className="h-6 w-6 text-indigo-600" />
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground mb-2">
          Hearings in the next 7 days
        </p>
        
        {upcomingHearings.length > 0 && (
          <div className="space-y-1.5 flex-1 border-t pt-2">
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
        
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full mt-auto"
          onClick={() => navigate('/hearings?dateRange=next7days')}
        >
          View Calendar
          <ArrowRight className="ml-2 h-3 w-3" />
        </Button>
      </CardContent>
    </Card>
  );
};

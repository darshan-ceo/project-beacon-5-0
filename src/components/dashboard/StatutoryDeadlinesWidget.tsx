/**
 * Statutory Deadlines Dashboard Widget
 * Displays upcoming statutory deadlines with urgency indicators
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, AlertTriangle, Clock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useDeadlineNotifications } from '@/hooks/useDeadlineNotifications';
import { format, parseISO } from 'date-fns';

export const StatutoryDeadlinesWidget: React.FC = () => {
  const navigate = useNavigate();
  const { stats, pendingDeadlines, isLoading } = useDeadlineNotifications();
  
  // Get top 3 most urgent deadlines
  const urgentDeadlines = pendingDeadlines
    .filter(d => d.status === 'breached' || d.status === 'today' || d.status === 'tomorrow')
    .slice(0, 3);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'breached':
        return 'bg-destructive text-destructive-foreground';
      case 'today':
        return 'bg-orange-500 text-white';
      case 'tomorrow':
        return 'bg-amber-500 text-white';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'breached':
        return 'Overdue';
      case 'today':
        return 'Due Today';
      case 'tomorrow':
        return 'Tomorrow';
      default:
        return 'Upcoming';
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          Statutory Deadlines
        </CardTitle>
        {stats.breached > 0 && (
          <Badge 
            variant="destructive" 
            className="animate-pulse cursor-pointer hover:bg-destructive/90"
            onClick={(e) => {
              e.stopPropagation();
              navigate('/statutory-acts?filter=breached');
            }}
          >
            {stats.breached} overdue
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Stats Summary */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-lg bg-destructive/10">
              <div className="text-lg font-bold text-destructive">{stats.breached}</div>
              <div className="text-xs text-muted-foreground">Overdue</div>
            </div>
            <div className="p-2 rounded-lg bg-orange-500/10">
              <div className="text-lg font-bold text-orange-600">{stats.today}</div>
              <div className="text-xs text-muted-foreground">Today</div>
            </div>
            <div className="p-2 rounded-lg bg-amber-500/10">
              <div className="text-lg font-bold text-amber-600">{stats.thisWeek}</div>
              <div className="text-xs text-muted-foreground">This Week</div>
            </div>
          </div>

          {/* Urgent Deadlines List */}
          {urgentDeadlines.length > 0 ? (
            <div className="space-y-2">
              {urgentDeadlines.map((deadline, index) => (
                <div 
                  key={`${deadline.caseId}-${index}`}
                  className="flex items-center justify-between p-2 rounded-lg bg-background/60 hover:bg-background/80 cursor-pointer transition-colors"
                  onClick={() => navigate(`/cases/${deadline.caseId}`)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{deadline.caseNumber}</p>
                    <p className="text-xs text-muted-foreground truncate">{deadline.eventTypeName}</p>
                  </div>
                  <Badge className={`ml-2 ${getStatusColor(deadline.status)}`}>
                    {getStatusLabel(deadline.status)}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm">No urgent deadlines</span>
            </div>
          )}

          <Button 
            variant="outline" 
            size="sm" 
            className="w-full mt-2"
            onClick={() => navigate('/statutory-acts')}
          >
            View All Deadlines
            <ArrowRight className="ml-2 h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

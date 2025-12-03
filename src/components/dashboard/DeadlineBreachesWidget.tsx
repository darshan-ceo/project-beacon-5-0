/**
 * Deadline Breaches Dashboard Widget
 * Shows count and trend of statutory deadline breaches
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowRight, TrendingDown, TrendingUp } from 'lucide-react';
import { useDeadlineNotifications } from '@/hooks/useDeadlineNotifications';

export const DeadlineBreachesWidget: React.FC = () => {
  const navigate = useNavigate();
  const { stats, urgentDeadlines, isLoading } = useDeadlineNotifications();
  
  const totalUrgent = stats.breached + stats.today;
  const hasBreaches = stats.breached > 0;

  return (
    <Card className={`hover:shadow-lg transition-shadow h-full ${
      hasBreaches 
        ? 'bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 border-destructive/30' 
        : 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20'
    }`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <AlertTriangle className={`h-4 w-4 ${hasBreaches ? 'text-destructive' : 'text-green-600'}`} />
          Deadline Breaches
        </CardTitle>
        {hasBreaches && (
          <Badge variant="destructive" className="animate-pulse">
            Action Required
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Main Count */}
          <div className={`text-3xl font-bold ${hasBreaches ? 'text-destructive' : 'text-green-600'}`}>
            {stats.breached}
          </div>
          <p className="text-xs text-muted-foreground">
            Statutory deadlines exceeded
          </p>

          {/* Breakdown */}
          <div className="space-y-2 pt-2 border-t">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Due today</span>
              <Badge variant={stats.today > 0 ? "destructive" : "secondary"}>
                {stats.today}
              </Badge>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Due tomorrow</span>
              <Badge variant={stats.tomorrow > 0 ? "outline" : "secondary"}>
                {stats.tomorrow}
              </Badge>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">This week</span>
              <Badge variant="secondary">{stats.thisWeek}</Badge>
            </div>
          </div>

          {/* Warning Message */}
          {totalUrgent > 0 && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 text-destructive text-xs">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              <span>{totalUrgent} deadline{totalUrgent !== 1 ? 's' : ''} need{totalUrgent === 1 ? 's' : ''} immediate attention</span>
            </div>
          )}

          <Button 
            variant={hasBreaches ? "destructive" : "outline"}
            size="sm" 
            className="w-full mt-2"
            onClick={() => navigate('/statutory-acts?filter=urgent')}
          >
            {hasBreaches ? 'View Breaches' : 'View Deadlines'}
            <ArrowRight className="ml-2 h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

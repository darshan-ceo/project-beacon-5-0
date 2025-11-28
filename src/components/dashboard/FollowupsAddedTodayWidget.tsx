import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppState } from '@/contexts/AppStateContext';
import { Plus, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

export const FollowupsAddedTodayWidget = () => {
  const { state } = useAppState();
  const navigate = useNavigate();

  const todayStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get unique task IDs that had follow-ups added today
    const taskIdsWithFollowupsToday = new Set(
      state.taskFollowUps
        .filter(followUp => {
          if (!followUp.createdAt) return false;
          const followUpDate = new Date(followUp.createdAt);
          followUpDate.setHours(0, 0, 0, 0);
          return followUpDate.getTime() === today.getTime();
        })
        .map(followUp => followUp.taskId)
    );

    return {
      count: taskIdsWithFollowupsToday.size,
      trend: taskIdsWithFollowupsToday.size > 0 ? '+' : ''
    };
  }, [state.taskFollowUps]);

  return (
    <Card 
      className="hover:shadow-lg transition-shadow bg-gradient-to-br from-emerald-50 to-green-50 cursor-pointer"
      onClick={() => navigate('/tasks?filter=followups_added_today')}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Plus className="h-4 w-4 text-emerald-600" />
          Follow-ups Added Today
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <div className="text-4xl font-bold text-emerald-600">
              {todayStats.count}
            </div>
            {todayStats.count > 0 && (
              <div className="flex items-center gap-1 text-sm text-emerald-600">
                <TrendingUp className="h-3 w-3" />
                <span>{todayStats.trend}</span>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            New tasks created today
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

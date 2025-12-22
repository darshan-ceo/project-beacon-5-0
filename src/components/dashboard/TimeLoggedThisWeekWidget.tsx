import { Card, CardContent } from '@/components/ui/card';
import { useAppState } from '@/contexts/AppStateContext';
import { Clock } from 'lucide-react';
import { useMemo } from 'react';

export const TimeLoggedThisWeekWidget = () => {
  const { state } = useAppState();

  const timeStats = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const totalHours = state.tasks
      .filter(task => {
        if (!task.completedDate || !task.actualHours) return false;
        const completedDate = new Date(task.completedDate);
        return completedDate >= startOfWeek;
      })
      .reduce((sum, task) => sum + (task.actualHours || 0), 0);

    return {
      hours: totalHours,
      formatted: totalHours.toFixed(1)
    };
  }, [state.tasks]);

  return (
    <Card className="hover:shadow-md transition-shadow border-l-4 border-l-green-500 h-full flex flex-col">
      <CardContent className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">Time Logged This Week</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-foreground">{timeStats.formatted}</p>
              <span className="text-sm text-muted-foreground">hours</span>
            </div>
          </div>
          <div className="p-3 rounded-full bg-green-100 flex-shrink-0">
            <Clock className="h-6 w-6 text-green-600" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Logged across completed tasks
        </p>
      </CardContent>
    </Card>
  );
};

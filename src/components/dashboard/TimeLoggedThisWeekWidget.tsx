import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <Card className="hover:shadow-lg transition-shadow bg-gradient-to-br from-blue-50 to-cyan-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-600" />
          Time Logged This Week
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <div className="text-4xl font-bold text-blue-600">
              {timeStats.formatted}
            </div>
            <div className="text-sm text-muted-foreground">hours</div>
          </div>
          <p className="text-xs text-muted-foreground">
            Logged across completed tasks
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppState } from '@/contexts/AppStateContext';
import { CheckCircle2, Clock } from 'lucide-react';
import { useMemo } from 'react';

export const TimelineComplianceWidget = () => {
  const { state } = useAppState();

  const complianceStats = useMemo(() => {
    const activeCases = state.cases.filter(c => c.status === 'Active');
    const totalCases = activeCases.length;
    
    if (totalCases === 0) {
      return { onTime: 0, delayed: 0, percentage: 0 };
    }

    const onTimeCases = activeCases.filter(c => {
      // Cases without RAG status or Green are considered on-time
      return !c.timelineBreachStatus || c.timelineBreachStatus === 'Green';
    }).length;

    const delayedCases = totalCases - onTimeCases;
    const percentage = Math.round((onTimeCases / totalCases) * 100);

    return { onTime: onTimeCases, delayed: delayedCases, percentage };
  }, [state.cases]);

  return (
    <Card className="hover:shadow-lg transition-shadow bg-gradient-to-br from-green-50 to-emerald-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          Timeline Compliance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold text-green-600">
              {complianceStats.percentage}%
            </div>
            <div className="text-sm text-muted-foreground">
              Compliance Rate
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                On Time
              </span>
              <span className="font-semibold">{complianceStats.onTime}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-amber-500" />
                Delayed
              </span>
              <span className="font-semibold">{complianceStats.delayed}</span>
            </div>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${complianceStats.percentage}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

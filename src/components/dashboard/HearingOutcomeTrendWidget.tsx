import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppState } from '@/contexts/AppStateContext';
import { Gavel } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export const HearingOutcomeTrendWidget = () => {
  const { state } = useAppState();
  const navigate = useNavigate();

  const outcomeData = useMemo(() => {
    const outcomes = {
      Adjournment: 0,
      'Submission Done': 0,
      'Order Passed': 0,
      Closed: 0,
      Pending: 0,
    };

    state.hearings.forEach(hearing => {
      if (hearing.outcome === 'Adjournment') {
        outcomes.Adjournment++;
      } else if (hearing.outcome === 'Submission Done') {
        outcomes['Submission Done']++;
      } else if (hearing.outcome === 'Order Passed') {
        outcomes['Order Passed']++;
      } else if (hearing.outcome === 'Closed') {
        outcomes.Closed++;
      } else {
        // No outcome = Pending
        outcomes.Pending++;
      }
    });

    return [
      { name: 'Adjournment', value: outcomes.Adjournment, color: '#f59e0b', outcomeKey: 'Adjournment' },
      { name: 'Submission Done', value: outcomes['Submission Done'], color: '#3b82f6', outcomeKey: 'Submission Done' },
      { name: 'Order Passed', value: outcomes['Order Passed'], color: '#22c55e', outcomeKey: 'Order Passed' },
      { name: 'Closed', value: outcomes.Closed, color: '#10b981', outcomeKey: 'Closed' },
      { name: 'Pending', value: outcomes.Pending, color: '#6366f1', outcomeKey: 'Pending' },
    ].filter(item => item.value > 0); // Only show categories with data
  }, [state.hearings]);

  const handlePieClick = (data: any) => {
    if (data && data.outcomeKey) {
      if (data.outcomeKey === 'Pending') {
        // Pending = scheduled hearings without outcome
        navigate('/hearings?status=scheduled');
      } else {
        // Navigate to exact outcome (URL encode for "Submission Done" and "Order Passed")
        navigate(`/hearings?outcome=${encodeURIComponent(data.outcomeKey)}`);
      }
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow bg-gradient-to-br from-indigo-50 to-violet-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Gavel className="h-4 w-4 text-purple-600" />
          Hearing Outcomes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={outcomeData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={60}
                paddingAngle={5}
                dataKey="value"
                onClick={handlePieClick}
              >
                {outcomeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} style={{ cursor: 'pointer' }} />
                ))}
              </Pie>
              <Tooltip />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                iconSize={10}
                formatter={(value) => <span className="text-xs">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

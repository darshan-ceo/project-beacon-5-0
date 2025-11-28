import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '@/contexts/AppStateContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export const CasesByStageWidget: React.FC = () => {
  const { state } = useAppState();
  const navigate = useNavigate();
  
  // Group cases by stage
  const stageGroups = state.cases.reduce((acc, c) => {
    const stage = c.currentStage || 'Assessment';
    acc[stage] = (acc[stage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const chartData = Object.entries(stageGroups).map(([stage, count]) => ({
    stage: stage.substring(0, 12),
    fullStage: stage,
    count
  }));
  
  const handleBarClick = (data: any) => {
    if (data && data.fullStage) {
      navigate(`/cases?stage=${encodeURIComponent(data.fullStage)}`);
    }
  };
  
  return (
    <Card className="hover:shadow-lg transition-shadow bg-gradient-to-br from-blue-50 to-indigo-50 md:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-blue-600" />
          Cases by Stage
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis 
                  dataKey="stage" 
                  tick={{ fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar 
                  dataKey="count" 
                  fill="#3b82f6" 
                  radius={[4, 4, 0, 0]} 
                  onClick={handleBarClick}
                  style={{ cursor: 'pointer' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full mt-2 hover:bg-blue-100"
            onClick={() => navigate('/cases')}
          >
            View All Cases
            <ArrowRight className="ml-2 h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

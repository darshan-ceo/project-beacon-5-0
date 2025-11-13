import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '@/contexts/AppStateContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { differenceInDays, parseISO } from 'date-fns';

export const CaseAgingSummaryWidget: React.FC = () => {
  const { state } = useAppState();
  const navigate = useNavigate();
  
  // Calculate case age in days
  const now = new Date();
  const ageGroups = {
    '0-30 days': 0,
    '31-60 days': 0,
    '61-90 days': 0,
    '90+ days': 0
  };
  
  state.cases.forEach(c => {
    if (c.status !== 'Active') return;
    try {
      const age = differenceInDays(now, parseISO(c.createdDate || ''));
      if (age <= 30) ageGroups['0-30 days']++;
      else if (age <= 60) ageGroups['31-60 days']++;
      else if (age <= 90) ageGroups['61-90 days']++;
      else ageGroups['90+ days']++;
    } catch (e) {
      // Skip invalid dates
    }
  });
  
  const chartData = Object.entries(ageGroups).map(([range, count]) => ({
    range,
    count
  }));
  
  return (
    <Card className="hover:shadow-lg transition-shadow bg-gradient-to-br from-cyan-50 to-teal-50 md:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4 text-cyan-600" />
          Case Aging Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis 
                  dataKey="range" 
                  tick={{ fontSize: 10 }}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full mt-2 hover:bg-cyan-100"
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

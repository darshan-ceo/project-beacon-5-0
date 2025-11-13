import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '@/contexts/AppStateContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Briefcase, ArrowRight } from 'lucide-react';

export const OpenCasesWidget: React.FC = () => {
  const { state } = useAppState();
  const navigate = useNavigate();
  
  const openCases = state.cases.filter(c => c.status === 'Active');
  const criticalCases = openCases.filter(c => c.priority === 'High');
  
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-primary" />
          Open Cases
        </CardTitle>
        {criticalCases.length > 0 && (
          <Badge variant="destructive">
            {criticalCases.length} critical
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="text-2xl font-bold text-foreground">{openCases.length}</div>
          <p className="text-xs text-muted-foreground">
            Active cases across all stages
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full mt-2"
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

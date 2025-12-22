import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '@/contexts/AppStateContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Briefcase, ArrowRight } from 'lucide-react';

export const OpenCasesWidget: React.FC = () => {
  const { state } = useAppState();
  const navigate = useNavigate();
  
  const openCases = state.cases.filter(c => c.status === 'Active');
  const criticalCases = openCases.filter(c => c.priority === 'High');
  
  return (
    <Card className="hover:shadow-md transition-shadow border-l-4 border-l-blue-500 h-full flex flex-col">
      <CardContent className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-muted-foreground">Open Cases</p>
              {criticalCases.length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {criticalCases.length} critical
                </Badge>
              )}
            </div>
            <p className="text-3xl font-bold text-foreground">{openCases.length}</p>
          </div>
          <div className="p-3 rounded-full bg-blue-100 flex-shrink-0">
            <Briefcase className="h-6 w-6 text-blue-600" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Active cases across all stages
        </p>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full mt-auto"
          onClick={() => navigate('/cases')}
        >
          View All Cases
          <ArrowRight className="ml-2 h-3 w-3" />
        </Button>
      </CardContent>
    </Card>
  );
};

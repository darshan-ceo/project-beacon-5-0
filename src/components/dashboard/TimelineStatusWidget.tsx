import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '@/contexts/AppStateContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Signal, ArrowRight } from 'lucide-react';

export const TimelineStatusWidget: React.FC = () => {
  const { state } = useAppState();
  const navigate = useNavigate();
  
  // Calculate RAG status from cases
  const greenCases = state.cases.filter(c => c.status === 'Active' && c.timelineBreachStatus === 'Green').length;
  const amberCases = state.cases.filter(c => c.status === 'Active' && c.timelineBreachStatus === 'Amber').length;
  const redCases = state.cases.filter(c => c.status === 'Active' && c.timelineBreachStatus === 'Red').length;
  
  return (
    <Card className="hover:shadow-lg transition-shadow bg-gradient-to-br from-amber-50 to-orange-50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Signal className="h-4 w-4 text-amber-600" />
          Timeline Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span className="text-sm text-muted-foreground">Green</span>
            </div>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              {greenCases}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-amber-500" />
              <span className="text-sm text-muted-foreground">Amber</span>
            </div>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              {amberCases}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500" />
              <span className="text-sm text-muted-foreground">Red</span>
            </div>
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
              {redCases}
            </Badge>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full mt-2 hover:bg-amber-100"
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

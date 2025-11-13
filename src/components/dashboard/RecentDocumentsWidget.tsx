import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '@/contexts/AppStateContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, ArrowRight } from 'lucide-react';
import { format, isToday, parseISO } from 'date-fns';

export const RecentDocumentsWidget: React.FC = () => {
  const { state } = useAppState();
  const navigate = useNavigate();
  
  const todayDocs = state.documents.filter(d => {
    try {
      return isToday(parseISO(d.uploadedAt || ''));
    } catch {
      return false;
    }
  });
  
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Documents Uploaded Today
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="text-2xl font-bold text-foreground">{todayDocs.length}</div>
          <p className="text-xs text-muted-foreground">
            Documents added today
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full mt-2"
            onClick={() => navigate('/documents')}
          >
            View All Documents
            <ArrowRight className="ml-2 h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

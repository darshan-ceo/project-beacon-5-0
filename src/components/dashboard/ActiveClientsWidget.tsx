import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '@/contexts/AppStateContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, ArrowRight } from 'lucide-react';

export const ActiveClientsWidget: React.FC = () => {
  const { state } = useAppState();
  const navigate = useNavigate();
  
  const activeClients = state.clients.filter(c => c.status === 'Active');
  
  return (
    <Card className="hover:shadow-lg transition-shadow bg-gradient-to-br from-purple-50 to-violet-50 h-full flex flex-col overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 h-[60px]">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Active Clients
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between">
        <div className="space-y-3">
          <div className="text-2xl font-bold text-foreground">{activeClients.length}</div>
          <p className="text-xs text-muted-foreground">
            Total active clients in the system
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full mt-4"
          onClick={() => navigate('/clients')}
        >
          View All Clients
          <ArrowRight className="ml-2 h-3 w-3" />
        </Button>
      </CardContent>
    </Card>
  );
};

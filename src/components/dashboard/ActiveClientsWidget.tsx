import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '@/contexts/AppStateContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, ArrowRight } from 'lucide-react';

export const ActiveClientsWidget: React.FC = () => {
  const { state } = useAppState();
  const navigate = useNavigate();
  
  const activeClients = state.clients.filter(c => c.status === 'Active');
  
  return (
    <Card className="hover:shadow-md transition-shadow border-l-4 border-l-purple-500 h-full flex flex-col">
      <CardContent className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">Active Clients</p>
            <p className="text-3xl font-bold text-foreground">{activeClients.length}</p>
          </div>
          <div className="p-3 rounded-full bg-purple-100 flex-shrink-0">
            <Users className="h-6 w-6 text-purple-600" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Total active clients in the system
        </p>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full mt-auto"
          onClick={() => navigate('/clients')}
        >
          View All Clients
          <ArrowRight className="ml-2 h-3 w-3" />
        </Button>
      </CardContent>
    </Card>
  );
};

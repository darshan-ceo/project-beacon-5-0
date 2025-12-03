import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Scale, FileText, Calendar } from 'lucide-react';

export const StatutoryMastersTabs: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const getCurrentTab = () => {
    if (location.pathname.includes('statutory-event-types')) return 'event-types';
    if (location.pathname.includes('holidays')) return 'holidays';
    return 'acts';
  };

  return (
    <Tabs value={getCurrentTab()} className="mb-6">
      <TabsList className="grid w-full grid-cols-3 max-w-md">
        <TabsTrigger 
          value="acts" 
          onClick={() => navigate('/statutory-acts')}
          className="flex items-center gap-2"
        >
          <Scale className="h-4 w-4" />
          <span className="hidden sm:inline">Acts</span>
        </TabsTrigger>
        <TabsTrigger 
          value="event-types" 
          onClick={() => navigate('/statutory-event-types')}
          className="flex items-center gap-2"
        >
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">Event Types</span>
        </TabsTrigger>
        <TabsTrigger 
          value="holidays" 
          onClick={() => navigate('/holidays')}
          className="flex items-center gap-2"
        >
          <Calendar className="h-4 w-4" />
          <span className="hidden sm:inline">Holidays</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
};

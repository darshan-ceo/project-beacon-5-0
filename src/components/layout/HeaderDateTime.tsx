import React, { useState, useEffect } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';

export const HeaderDateTime: React.FC = () => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border/50">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Calendar className="h-3.5 w-3.5" />
        <span className="font-medium">{format(now, 'EEE, MMM d')}</span>
      </div>
      <div className="h-4 w-px bg-border" />
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        <span className="font-medium">{format(now, 'h:mm a')}</span>
      </div>
    </div>
  );
};

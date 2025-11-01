import React from 'react';

export const CalendarColorLegend: React.FC = () => {
  return (
    <div className="flex flex-wrap gap-3 p-3 bg-muted/30 rounded-lg text-sm">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }} />
        <span className="text-muted-foreground">🟢 Future</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3b82f6' }} />
        <span className="text-muted-foreground">🔵 Today</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f97316' }} />
        <span className="text-muted-foreground">🟠 Adjourned</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }} />
        <span className="text-muted-foreground">🔴 Closed</span>
      </div>
    </div>
  );
};

import React from 'react';
import { cn } from '@/lib/utils';
import { 
  FileText, BarChart3, TrendingUp, DollarSign, 
  Calendar, FolderOpen, AlertTriangle 
} from 'lucide-react';

const sections = [
  { id: 'cover', label: 'Cover', icon: FileText },
  { id: 'executive-summary', label: 'Executive Summary', icon: BarChart3 },
  { id: 'lifecycle', label: 'Lifecycle Intelligence', icon: TrendingUp },
  { id: 'financial', label: 'Financial Exposure', icon: DollarSign },
  { id: 'hearings', label: 'Hearings', icon: Calendar },
  { id: 'documents', label: 'Documents', icon: FolderOpen },
  { id: 'risk-matrix', label: 'Risk & Action Matrix', icon: AlertTriangle },
];

interface IntelligenceSidebarProps {
  activeSection: string;
  onNavigate: (id: string) => void;
}

export const IntelligenceSidebar: React.FC<IntelligenceSidebarProps> = ({ activeSection, onNavigate }) => {
  return (
    <nav className="hidden lg:block w-56 flex-shrink-0 sticky top-20 h-fit">
      <div className="space-y-1">
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              onClick={() => onNavigate(s.id)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-left',
                activeSection === s.id
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {s.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

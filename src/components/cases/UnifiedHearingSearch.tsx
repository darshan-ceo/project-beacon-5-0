import React from 'react';
import { Gavel, User, Scale, Calendar, FileText, Users } from 'lucide-react';
import { UnifiedModuleSearch, FilterConfig } from '@/components/search/UnifiedModuleSearch';

interface UnifiedHearingSearchProps {
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  activeFilters: Record<string, any>;
  onFiltersChange: (filters: Record<string, any>) => void;
  clients?: { id: string; name: string }[];
  cases?: { id: string; caseNumber: string }[];
  legalForums?: string[];
  judges?: string[];
  counsels?: string[];
}

export const UnifiedHearingSearch: React.FC<UnifiedHearingSearchProps> = ({
  searchTerm,
  onSearchTermChange,
  activeFilters,
  onFiltersChange,
  clients = [],
  cases = [],
  legalForums = ['Supreme Court', 'High Court', 'Tribunal', 'Commissioner Appeals'],
  judges = [],
  counsels = []
}) => {
  const filterConfig: FilterConfig[] = [
    {
      id: 'clientId',
      label: 'Client',
      type: 'dropdown',
      icon: User,
      options: clients.map(c => ({ label: c.name, value: c.id }))
    },
    {
      id: 'caseId',
      label: 'Case',
      type: 'dropdown',
      icon: FileText,
      options: cases.map(c => ({ label: c.caseNumber, value: c.id }))
    },
    {
      id: 'legalForum',
      label: 'Legal Forum',
      type: 'dropdown',
      icon: Scale,
      options: legalForums.map(forum => ({ label: forum, value: forum }))
    },
    {
      id: 'judge',
      label: 'Judge',
      type: 'dropdown',
      icon: Gavel,
      options: judges.map(judge => ({ label: judge, value: judge }))
    },
    {
      id: 'type',
      label: 'Type',
      type: 'dropdown',
      icon: FileText,
      options: [
        { label: 'Preliminary', value: 'Preliminary' },
        { label: 'Final', value: 'Final' },
        { label: 'Argued', value: 'Argued' },
        { label: 'Adjourned', value: 'Adjourned' }
      ]
    },
    {
      id: 'status',
      label: 'Status',
      type: 'dropdown',
      icon: Calendar,
      options: [
        { label: 'Scheduled', value: 'Scheduled' },
        { label: 'Completed', value: 'Completed' },
        { label: 'Postponed', value: 'Postponed' }
      ]
    },
    {
      id: 'internalCounsel',
      label: 'Counsel',
      type: 'dropdown',
      icon: Users,
      options: counsels.map(counsel => ({ label: counsel, value: counsel }))
    },
    {
      id: 'hearingDate',
      label: 'Hearing Date',
      type: 'dateRange',
      icon: Calendar
    }
  ];

  return (
    <UnifiedModuleSearch
      moduleName="Hearings"
      moduleIcon={Gavel}
      searchPlaceholder="Search by case number, legal forum, judge, or hearing type..."
      searchTerm={searchTerm}
      onSearchTermChange={onSearchTermChange}
      activeFilters={activeFilters}
      onFiltersChange={onFiltersChange}
      filterConfig={filterConfig}
      keyboardShortcut="Ctrl+F"
    />
  );
};
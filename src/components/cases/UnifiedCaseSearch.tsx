import React from 'react';
import { Scale, User, TrendingUp, Flag, Tag, Calendar } from 'lucide-react';
import { UnifiedModuleSearch, FilterConfig } from '@/components/search/UnifiedModuleSearch';

interface UnifiedCaseSearchProps {
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  activeFilters: Record<string, any>;
  onFiltersChange: (filters: Record<string, any>) => void;
  clients?: { id: string; name: string }[];
  caseTypes?: string[];
}

export const UnifiedCaseSearch: React.FC<UnifiedCaseSearchProps> = ({
  searchTerm,
  onSearchTermChange,
  activeFilters,
  onFiltersChange,
  clients = [],
  caseTypes = ['GST', 'Income Tax', 'Custom', 'Excise', 'Service Tax']
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
      id: 'stage',
      label: 'Stage',
      type: 'dropdown',
      icon: TrendingUp,
      options: [
        { label: 'Assessment', value: 'Assessment' },
        { label: 'Adjudication', value: 'Adjudication' },
        { label: 'First Appeal', value: 'First Appeal' },
        { label: 'Tribunal', value: 'Tribunal' },
        { label: 'High Court', value: 'High Court' },
        { label: 'Supreme Court', value: 'Supreme Court' }
      ]
    },
    {
      id: 'status',
      label: 'Status',
      type: 'dropdown',
      icon: Flag,
      options: [
        { label: 'Active', value: 'Active' },
        { label: 'Completed', value: 'Completed' }
      ]
    },
    {
      id: 'timelineStatus',
      label: 'Timeline',
      type: 'dropdown',
      icon: Calendar,
      options: [
        { label: 'Green - On Track', value: 'Green' },
        { label: 'Amber - At Risk', value: 'Amber' },
        { label: 'Red - Overdue', value: 'Red' }
      ]
    },
    {
      id: 'priority',
      label: 'Priority',
      type: 'dropdown',
      icon: Flag,
      options: [
        { label: 'High', value: 'High' },
        { label: 'Medium', value: 'Medium' },
        { label: 'Low', value: 'Low' }
      ]
    },
    {
      id: 'caseTypes',
      label: 'Case Type',
      type: 'tags',
      icon: Tag,
      tags: caseTypes.map(type => ({ name: type }))
    },
    {
      id: 'registrationDate',
      label: 'Registration Date',
      type: 'dateRange',
      icon: Calendar
    }
  ];

  return (
    <UnifiedModuleSearch
      moduleName="Cases"
      moduleIcon={Scale}
      searchPlaceholder="Search by case number, client name, GSTIN, or title..."
      searchTerm={searchTerm}
      onSearchTermChange={onSearchTermChange}
      activeFilters={activeFilters}
      onFiltersChange={onFiltersChange}
      filterConfig={filterConfig}
      keyboardShortcut="Ctrl+F"
    />
  );
};
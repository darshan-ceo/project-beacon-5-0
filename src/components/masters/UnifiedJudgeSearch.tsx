import React from 'react';
import { Gavel, Scale, Tag, Calendar, Award } from 'lucide-react';
import { UnifiedModuleSearch, FilterConfig } from '@/components/search/UnifiedModuleSearch';

interface UnifiedJudgeSearchProps {
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  activeFilters: Record<string, any>;
  onFiltersChange: (filters: Record<string, any>) => void;
  legalForums?: string[];
  designations?: string[];
  specializations?: string[];
}

export const UnifiedJudgeSearch: React.FC<UnifiedJudgeSearchProps> = ({
  searchTerm,
  onSearchTermChange,
  activeFilters,
  onFiltersChange,
  legalForums = [],
  designations = ['Chief Justice', 'Justice', 'Member', 'Judicial Member', 'Technical Member'],
  specializations = []
}) => {
  const filterConfig: FilterConfig[] = [
    {
      id: 'legalForum',
      label: 'Legal Forum',
      type: 'dropdown',
      icon: Scale,
      options: legalForums.map(forum => ({ label: forum, value: forum }))
    },
    {
      id: 'designation',
      label: 'Designation',
      type: 'dropdown',
      icon: Award,
      options: designations.map(designation => ({ label: designation, value: designation }))
    },
    {
      id: 'status',
      label: 'Status',
      type: 'dropdown',
      icon: Tag,
      options: [
        { label: 'Active', value: 'Active' },
        { label: 'On Leave', value: 'On Leave' },
        { label: 'Retired', value: 'Retired' },
        { label: 'Transferred', value: 'Transferred' }
      ]
    },
    {
      id: 'specializations',
      label: 'Specialization',
      type: 'tags',
      icon: Gavel,
      tags: specializations.length > 0 
        ? specializations.map(spec => ({ name: spec }))
        : [
            { name: 'Tax Law' },
            { name: 'Corporate Law' },
            { name: 'Constitutional Law' },
            { name: 'Criminal Law' },
            { name: 'Civil Law' }
          ]
    },
    {
      id: 'appointmentDate',
      label: 'Appointment Date',
      type: 'dateRange',
      icon: Calendar
    }
  ];

  return (
    <UnifiedModuleSearch
      moduleName="Judges"
      moduleIcon={Gavel}
      searchPlaceholder="Search by name, designation, legal forum, or specialization..."
      searchTerm={searchTerm}
      onSearchTermChange={onSearchTermChange}
      activeFilters={activeFilters}
      onFiltersChange={onFiltersChange}
      filterConfig={filterConfig}
      keyboardShortcut="Ctrl+F"
    />
  );
};
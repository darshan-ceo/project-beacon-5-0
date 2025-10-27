import React from 'react';
import { Users, Briefcase, Building, Tag, Calendar, Award } from 'lucide-react';
import { UnifiedModuleSearch, FilterConfig } from '@/components/search/UnifiedModuleSearch';

interface UnifiedEmployeeSearchProps {
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  activeFilters: Record<string, any>;
  onFiltersChange: (filters: Record<string, any>) => void;
  roles?: string[];
  departments?: string[];
  designations?: string[];
  skills?: string[];
}

export const UnifiedEmployeeSearch: React.FC<UnifiedEmployeeSearchProps> = ({
  searchTerm,
  onSearchTermChange,
  activeFilters,
  onFiltersChange,
  roles = [],
  departments = [],
  designations = [],
  skills = ['GST', 'Income Tax', 'Corporate Law', 'Compliance', 'Litigation', 'Advisory']
}) => {
  const filterConfig: FilterConfig[] = [
    {
      id: 'role',
      label: 'Role',
      type: 'dropdown',
      icon: Briefcase,
      options: roles.map(role => ({ label: role, value: role }))
    },
    {
      id: 'department',
      label: 'Department',
      type: 'dropdown',
      icon: Building,
      options: departments.map(dept => ({ label: dept, value: dept }))
    },
    {
      id: 'status',
      label: 'Status',
      type: 'dropdown',
      icon: Tag,
      options: [
        { label: 'Active', value: 'Active' },
        { label: 'On Leave', value: 'On Leave' },
        { label: 'Resigned', value: 'Resigned' }
      ]
    },
    {
      id: 'designation',
      label: 'Designation',
      type: 'dropdown',
      icon: Award,
      options: designations.map(designation => ({ label: designation, value: designation }))
    },
    {
      id: 'skills',
      label: 'Skills',
      type: 'tags',
      icon: Tag,
      tags: skills.map(skill => ({ name: skill }))
    },
    {
      id: 'joiningDate',
      label: 'Joining Date',
      type: 'dateRange',
      icon: Calendar
    }
  ];

  return (
    <UnifiedModuleSearch
      moduleName="Employees"
      moduleIcon={Users}
      searchPlaceholder="Search by name, role, department, designation, or email..."
      searchTerm={searchTerm}
      onSearchTermChange={onSearchTermChange}
      activeFilters={activeFilters}
      onFiltersChange={onFiltersChange}
      filterConfig={filterConfig}
      keyboardShortcut="Ctrl+F"
    />
  );
};
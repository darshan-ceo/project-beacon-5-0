import React from 'react';
import { Building2, MapPin, User, Tag, Calendar } from 'lucide-react';
import { UnifiedModuleSearch, FilterConfig } from '@/components/search/UnifiedModuleSearch';

interface UnifiedClientSearchProps {
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  activeFilters: Record<string, any>;
  onFiltersChange: (filters: Record<string, any>) => void;
  clientGroups?: string[];
  states?: string[];
  consultants?: string[];
  industries?: string[];
}

export const UnifiedClientSearch: React.FC<UnifiedClientSearchProps> = ({
  searchTerm,
  onSearchTermChange,
  activeFilters,
  onFiltersChange,
  clientGroups = [],
  states = [],
  consultants = [],
  industries = ['Manufacturing', 'Services', 'Trading', 'IT/Software', 'Healthcare', 'Real Estate']
}) => {
  const filterConfig: FilterConfig[] = [
    {
      id: 'clientGroup',
      label: 'Client Group',
      type: 'dropdown',
      icon: Building2,
      options: clientGroups.map(group => ({ label: group, value: group }))
    },
    {
      id: 'status',
      label: 'Status',
      type: 'dropdown',
      icon: Tag,
      options: [
        { label: 'Active', value: 'Active' },
        { label: 'Inactive', value: 'Inactive' },
        { label: 'Pending Review', value: 'Pending' }
      ]
    },
    {
      id: 'state',
      label: 'State',
      type: 'dropdown',
      icon: MapPin,
      options: states.map(state => ({ label: state, value: state }))
    },
    {
      id: 'consultant',
      label: 'Consultant',
      type: 'dropdown',
      icon: User,
      options: consultants.map(consultant => ({ label: consultant, value: consultant }))
    },
    {
      id: 'portalAccess',
      label: 'Portal Access',
      type: 'tags',
      icon: Tag,
      tags: [
        { name: 'Enabled' },
        { name: 'Disabled' }
      ]
    },
    {
      id: 'industries',
      label: 'Industry',
      type: 'tags',
      icon: Building2,
      tags: industries.map(industry => ({ name: industry }))
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
      moduleName="Clients"
      moduleIcon={Building2}
      searchPlaceholder="Search by ID, name, GSTIN, PAN, or contact..."
      searchTerm={searchTerm}
      onSearchTermChange={onSearchTermChange}
      activeFilters={activeFilters}
      onFiltersChange={onFiltersChange}
      filterConfig={filterConfig}
      keyboardShortcut="Ctrl+F"
    />
  );
};
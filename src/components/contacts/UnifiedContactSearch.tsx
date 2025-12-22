import React from 'react';
import { Users } from 'lucide-react';
import { UnifiedModuleSearch, FilterConfig } from '@/components/search/UnifiedModuleSearch';

export interface ContactFilters {
  dataScope?: string;
  status?: string;
  client?: string;
  role?: string;
  type?: string;
}

interface UnifiedContactSearchProps {
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  activeFilters: ContactFilters;
  onFiltersChange: (filters: ContactFilters) => void;
  clients?: { id: string; name: string }[];
}

export const UnifiedContactSearch: React.FC<UnifiedContactSearchProps> = ({
  searchTerm,
  onSearchTermChange,
  activeFilters,
  onFiltersChange,
  clients = []
}) => {
  const filterConfig: FilterConfig[] = [
    {
      id: 'dataScope',
      label: 'Data Scope',
      type: 'dropdown',
      options: [
        { value: 'OWN', label: 'Own' },
        { value: 'TEAM', label: 'Team' },
        { value: 'ALL', label: 'All' }
      ]
    },
    {
      id: 'status',
      label: 'Status',
      type: 'dropdown',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' }
      ]
    },
    {
      id: 'client',
      label: 'Client',
      type: 'dropdown',
      options: clients.map(c => ({ value: c.id, label: c.name }))
    },
    {
      id: 'role',
      label: 'Role',
      type: 'tags',
      options: [
        { value: 'primary', label: 'Primary Contact' },
        { value: 'billing', label: 'Billing Contact' },
        { value: 'legal_notice', label: 'Legal Notice' },
        { value: 'authorized_signatory', label: 'Authorized Signatory' }
      ]
    },
    {
      id: 'type',
      label: 'Type',
      type: 'dropdown',
      options: [
        { value: 'client-linked', label: 'Client-Linked' },
        { value: 'standalone', label: 'Standalone' }
      ]
    }
  ];

  return (
    <UnifiedModuleSearch
      moduleName="Contacts"
      moduleIcon={Users}
      searchPlaceholder="Search by name, email, designation, or client..."
      searchTerm={searchTerm}
      onSearchTermChange={onSearchTermChange}
      activeFilters={activeFilters}
      onFiltersChange={onFiltersChange}
      filterConfig={filterConfig}
    />
  );
};

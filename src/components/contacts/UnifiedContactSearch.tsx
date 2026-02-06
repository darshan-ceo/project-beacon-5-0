import React from 'react';
import { Users } from 'lucide-react';
import { UnifiedModuleSearch, FilterConfig } from '@/components/search/UnifiedModuleSearch';
import { LEAD_STATUS_CONFIG, LEAD_SOURCE_OPTIONS } from '@/types/lead';

export interface ContactFilters {
  dataScope?: string;
  status?: string;
  client?: string;
  role?: string;
  type?: string;
  leadStatus?: string;
  leadSource?: string;
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
  // Build lead status options from config
  const leadStatusOptions = Object.entries(LEAD_STATUS_CONFIG).map(([value, config]) => ({
    value,
    label: config.label
  }));

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
    },
    {
      id: 'leadStatus',
      label: 'Lead Status',
      type: 'dropdown',
      options: leadStatusOptions
    },
    {
      id: 'leadSource',
      label: 'Lead Source',
      type: 'dropdown',
      options: LEAD_SOURCE_OPTIONS.map(s => ({ value: s.value, label: s.label }))
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

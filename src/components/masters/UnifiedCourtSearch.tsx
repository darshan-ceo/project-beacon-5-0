import React from 'react';
import { Scale, MapPin, Tag, Building, Wifi } from 'lucide-react';
import { UnifiedModuleSearch, FilterConfig } from '@/components/search/UnifiedModuleSearch';
import { AUTHORITY_LEVEL_OPTIONS } from '@/types/authority-level';

interface UnifiedCourtSearchProps {
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  activeFilters: Record<string, any>;
  onFiltersChange: (filters: Record<string, any>) => void;
  jurisdictions?: string[];
  states?: string[];
  types?: string[];
}

export const UnifiedCourtSearch: React.FC<UnifiedCourtSearchProps> = ({
  searchTerm,
  onSearchTermChange,
  activeFilters,
  onFiltersChange,
  jurisdictions = [],
  states = [],
  types = ['Income Tax Appellate Tribunal', 'High Court', 'Supreme Court', 'Commissioner Appeals', 'Settlement Commission']
}) => {
  const filterConfig: FilterConfig[] = [
    {
      id: 'authorityLevel',
      label: 'Authority Level',
      type: 'dropdown',
      icon: Scale,
      options: AUTHORITY_LEVEL_OPTIONS.map(level => ({
        label: level.label,
        value: level.value
      }))
    },
    {
      id: 'jurisdiction',
      label: 'Jurisdiction',
      type: 'dropdown',
      icon: MapPin,
      options: jurisdictions.map(jurisdiction => ({ label: jurisdiction, value: jurisdiction }))
    },
    {
      id: 'status',
      label: 'Status',
      type: 'dropdown',
      icon: Tag,
      options: [
        { label: 'All Status', value: 'all' },
        { label: 'Active', value: 'Active' },
        { label: 'Inactive', value: 'Inactive' }
      ]
    },
    {
      id: 'digitalFiling',
      label: 'Digital Filing',
      type: 'dropdown',
      icon: Wifi,
      options: [
        { label: 'All', value: 'all' },
        { label: 'Enabled', value: 'true' },
        { label: 'Not Enabled', value: 'false' }
      ]
    },
    {
      id: 'type',
      label: 'Legacy Type',
      type: 'dropdown',
      icon: Building,
      options: types.map(type => ({ label: type, value: type }))
    }
  ];

  return (
    <UnifiedModuleSearch
      moduleName="Legal Forums"
      moduleIcon={Scale}
      searchPlaceholder="Search by name, jurisdiction, location, or type..."
      searchTerm={searchTerm}
      onSearchTermChange={onSearchTermChange}
      activeFilters={activeFilters}
      onFiltersChange={onFiltersChange}
      filterConfig={filterConfig}
      keyboardShortcut="Ctrl+F"
    />
  );
};
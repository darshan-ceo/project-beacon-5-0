import React from 'react';
import { Scale, MapPin, Tag, Building } from 'lucide-react';
import { UnifiedModuleSearch, FilterConfig } from '@/components/search/UnifiedModuleSearch';

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
      id: 'jurisdiction',
      label: 'Jurisdiction',
      type: 'dropdown',
      icon: Scale,
      options: jurisdictions.map(jurisdiction => ({ label: jurisdiction, value: jurisdiction }))
    },
    {
      id: 'state',
      label: 'State',
      type: 'dropdown',
      icon: MapPin,
      options: states.map(state => ({ label: state, value: state }))
    },
    {
      id: 'type',
      label: 'Type',
      type: 'dropdown',
      icon: Building,
      options: types.map(type => ({ label: type, value: type }))
    },
    {
      id: 'status',
      label: 'Status',
      type: 'dropdown',
      icon: Tag,
      options: [
        { label: 'Active', value: 'Active' },
        { label: 'Inactive', value: 'Inactive' }
      ]
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
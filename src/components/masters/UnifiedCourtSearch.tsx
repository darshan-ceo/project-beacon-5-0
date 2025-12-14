import React from 'react';
import { Scale, MapPin, Tag, Building, Wifi, Landmark, UserCheck } from 'lucide-react';
import { UnifiedModuleSearch, FilterConfig } from '@/components/search/UnifiedModuleSearch';
import { AUTHORITY_LEVEL_OPTIONS } from '@/types/authority-level';
import { TAX_JURISDICTION_OPTIONS, CGST_OFFICERS, SGST_OFFICERS } from '@/types/officer-designation';

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
  // Get officer options based on selected tax jurisdiction
  const getOfficerOptions = () => {
    const selectedJurisdiction = activeFilters.taxJurisdiction;
    if (selectedJurisdiction === 'CGST') {
      return CGST_OFFICERS.map(o => ({ label: o.label, value: o.value }));
    } else if (selectedJurisdiction === 'SGST') {
      return SGST_OFFICERS.map(o => ({ label: o.label, value: o.value }));
    }
    // Show all officers if no jurisdiction selected
    return [
      ...CGST_OFFICERS.map(o => ({ label: `${o.label} (CGST)`, value: o.value })),
      ...SGST_OFFICERS.map(o => ({ label: `${o.label} (SGST)`, value: o.value }))
    ];
  };

  const filterConfig: FilterConfig[] = [
    {
      id: 'taxJurisdiction',
      label: 'Tax Jurisdiction',
      type: 'dropdown',
      icon: Landmark,
      options: [
        { label: 'All Jurisdictions', value: 'all' },
        ...TAX_JURISDICTION_OPTIONS.map(j => ({ label: j.label, value: j.value }))
      ]
    },
    {
      id: 'officerDesignation',
      label: 'Officer Designation',
      type: 'dropdown',
      icon: UserCheck,
      options: [
        { label: 'All Designations', value: 'all' },
        ...getOfficerOptions()
      ]
    },
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
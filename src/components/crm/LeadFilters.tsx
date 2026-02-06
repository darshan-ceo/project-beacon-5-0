/**
 * LeadFilters Component
 * Filter bar for leads: search, source, owner
 */

import React from 'react';
import { Input } from '@/components/ui/input';
import { FilterDropdown } from '@/components/ui/filter-dropdown';
import { Search, Filter, User } from 'lucide-react';
import { LeadFilters as LeadFiltersType, LEAD_SOURCE_OPTIONS } from '@/types/lead';

interface LeadFiltersProps {
  filters: LeadFiltersType;
  onFiltersChange: (filters: LeadFiltersType) => void;
  owners?: { id: string; name: string }[];
}

export const LeadFilters: React.FC<LeadFiltersProps> = ({
  filters,
  onFiltersChange,
  owners = [],
}) => {
  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value || undefined });
  };

  const handleSourceChange = (value: string) => {
    onFiltersChange({ 
      ...filters, 
      source: value === 'all' ? undefined : value 
    });
  };

  const handleOwnerChange = (value: string) => {
    onFiltersChange({ 
      ...filters, 
      owner_user_id: value === 'all' ? undefined : value 
    });
  };

  const sourceOptions = LEAD_SOURCE_OPTIONS.map(s => ({
    label: s.label,
    value: s.value,
  }));

  const ownerOptions = owners.map(o => ({
    label: o.name,
    value: o.id,
  }));

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search leads..."
          value={filters.search || ''}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Source Filter */}
      <FilterDropdown
        label="Source"
        value={filters.source || 'all'}
        options={sourceOptions}
        onChange={handleSourceChange}
        icon={<Filter className="mr-2 h-4 w-4" />}
      />

      {/* Owner Filter (if owners provided) */}
      {ownerOptions.length > 0 && (
        <FilterDropdown
          label="Owner"
          value={filters.owner_user_id || 'all'}
          options={ownerOptions}
          onChange={handleOwnerChange}
          icon={<User className="mr-2 h-4 w-4" />}
        />
      )}
    </div>
  );
};

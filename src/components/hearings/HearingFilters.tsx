import React, { useState, useEffect } from 'react';
import { Search, Filter, X, Save, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { uiStateService } from '@/services/uiStateService';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';

import { FilterDropdown } from '@/components/ui/filter-dropdown';
import { useAppState } from '@/contexts/AppStateContext';
import { toast } from '@/hooks/use-toast';

export interface HearingFiltersState {
  searchTerm: string;
  clientIds: string[];
  caseIds: string[];
  courtIds: string[];
  judgeIds: string[];
  hearingTypes: string[];
  statuses: string[];
  internalCounselIds: string[];
  dateRange?: DateRange;
  tags: string[];
}

interface SavedView {
  id: string;
  name: string;
  filters: HearingFiltersState;
  createdAt: string;
  isDefault?: boolean;
}

interface HearingFiltersProps {
  filters: HearingFiltersState;
  onFiltersChange: (filters: HearingFiltersState) => void;
  className?: string;
}

export const HearingFilters: React.FC<HearingFiltersProps> = ({
  filters,
  onFiltersChange,
  className
}) => {
  const { state } = useAppState();
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  // Load saved views from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('hearing-saved-views');
    if (saved) {
      try {
        setSavedViews(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load saved views:', error);
      }
    }
  }, []);

  const updateFilters = (updates: Partial<HearingFiltersState>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      searchTerm: '',
      clientIds: [],
      caseIds: [],
      courtIds: [],
      judgeIds: [],
      hearingTypes: [],
      statuses: [],
      internalCounselIds: [],
      dateRange: undefined,
      tags: [],
    });
  };

  const saveCurrentView = () => {
    const name = prompt('Enter a name for this saved view:');
    if (!name) return;

    const newView: SavedView = {
      id: `view-${Date.now()}`,
      name,
      filters: { ...filters },
      createdAt: new Date().toISOString(),
    };

      const updatedViews = [...savedViews, newView];
      setSavedViews(updatedViews);
      uiStateService.saveSavedViews('hearing-filters', updatedViews);
    
    toast({
      title: "View Saved",
      description: `Saved view "${name}" successfully.`,
    });
  };

  const loadSavedView = (view: SavedView) => {
    onFiltersChange(view.filters);
    toast({
      title: "View Loaded",
      description: `Loaded saved view "${view.name}".`,
    });
  };

  const deleteSavedView = (viewId: string) => {
    const updatedViews = savedViews.filter(v => v.id !== viewId);
    setSavedViews(updatedViews);
    uiStateService.saveSavedViews('hearing-filters', updatedViews);
    
    toast({
      title: "View Deleted",
      description: "Saved view deleted successfully.",
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.searchTerm) count++;
    if (filters.clientIds.length > 0) count++;
    if (filters.caseIds.length > 0) count++;
    if (filters.courtIds.length > 0) count++;
    if (filters.judgeIds.length > 0) count++;
    if (filters.hearingTypes.length > 0) count++;
    if (filters.statuses.length > 0) count++;
    if (filters.internalCounselIds.length > 0) count++;
    if (filters.dateRange) count++;
    if (filters.tags.length > 0) count++;
    return count;
  };

  // Filter options
  const clientOptions = state.clients.map(c => ({ label: c.name, value: c.id }));
  const caseOptions = state.cases.map(c => ({ label: `${c.caseNumber} - ${c.title}`, value: c.id }));
  const courtOptions = state.courts.map(c => ({ label: c.name, value: c.id }));
  const judgeOptions = state.judges.map(j => ({ label: j.name, value: j.id }));
  const employeeOptions = state.employees.map(e => ({ label: e.full_name, value: e.id }));

  const hearingTypeOptions = [
    { label: 'Mention', value: 'mention' },
    { label: 'Final Hearing', value: 'final' },
    { label: 'Admission', value: 'admission' },
    { label: 'Stay', value: 'stay' },
    { label: 'Interim', value: 'interim' },
    { label: 'Compliance', value: 'compliance' },
    { label: 'Other', value: 'other' },
  ];

  const statusOptions = [
    { label: 'Scheduled', value: 'scheduled' },
    { label: 'Concluded', value: 'concluded' },
    { label: 'Adjourned', value: 'adjourned' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  return (
    <div className={className}>
      
      {/* Main Filter Bar */}
      <Card>
        <CardContent className="pt-6">
          
          {/* Search and Quick Actions */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search hearings..."
                value={filters.searchTerm}
                onChange={(e) => updateFilters({ searchTerm: e.target.value })}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2">
              {/* Filter Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filters
                {getActiveFilterCount() > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {getActiveFilterCount()}
                  </Badge>
                )}
              </Button>

              {/* Saved Views */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={saveCurrentView}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Current View
                  </DropdownMenuItem>
                  {savedViews.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      {savedViews.map((view) => (
                        <DropdownMenuItem
                          key={view.id}
                          onClick={() => loadSavedView(view)}
                          className="justify-between"
                        >
                          <span>{view.name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSavedView(view.id);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Clear All */}
              {getActiveFilterCount() > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-muted-foreground"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
          </div>

          {/* Expanded Filter Options */}
          {isFilterExpanded && (
            <>
              <Separator className="mb-4" />
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Client Filter */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Client</Label>
                  <FilterDropdown
                    label="Client"
                    value={filters.clientIds.length > 0 ? `${filters.clientIds.length} selected` : 'all'}
                    options={clientOptions}
                    onChange={(value) => {
                      if (value === 'all') {
                        updateFilters({ clientIds: [] });
                      } else {
                        const newClientIds = filters.clientIds.includes(value)
                          ? filters.clientIds.filter(id => id !== value)
                          : [...filters.clientIds, value];
                        updateFilters({ clientIds: newClientIds });
                      }
                    }}
                  />
                </div>

                {/* Case Filter */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Case</Label>
                  <FilterDropdown
                    label="Case"
                    value={filters.caseIds.length > 0 ? `${filters.caseIds.length} selected` : 'all'}
                    options={caseOptions}
                    onChange={(value) => {
                      if (value === 'all') {
                        updateFilters({ caseIds: [] });
                      } else {
                        const newCaseIds = filters.caseIds.includes(value)
                          ? filters.caseIds.filter(id => id !== value)
                          : [...filters.caseIds, value];
                        updateFilters({ caseIds: newCaseIds });
                      }
                    }}
                  />
                </div>

                {/* Court Filter */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Court</Label>
                  <FilterDropdown
                    label="Court"
                    value={filters.courtIds.length > 0 ? `${filters.courtIds.length} selected` : 'all'}
                    options={courtOptions}
                    onChange={(value) => {
                      if (value === 'all') {
                        updateFilters({ courtIds: [] });
                      } else {
                        const newCourtIds = filters.courtIds.includes(value)
                          ? filters.courtIds.filter(id => id !== value)
                          : [...filters.courtIds, value];
                        updateFilters({ courtIds: newCourtIds });
                      }
                    }}
                  />
                </div>

                {/* Judge Filter */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Judge</Label>
                  <FilterDropdown
                    label="Judge"
                    value={filters.judgeIds.length > 0 ? `${filters.judgeIds.length} selected` : 'all'}
                    options={judgeOptions}
                    onChange={(value) => {
                      if (value === 'all') {
                        updateFilters({ judgeIds: [] });
                      } else {
                        const newJudgeIds = filters.judgeIds.includes(value)
                          ? filters.judgeIds.filter(id => id !== value)
                          : [...filters.judgeIds, value];
                        updateFilters({ judgeIds: newJudgeIds });
                      }
                    }}
                  />
                </div>

                {/* Hearing Type Filter */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Type</Label>
                  <FilterDropdown
                    label="Type"
                    value={filters.hearingTypes.length > 0 ? `${filters.hearingTypes.length} selected` : 'all'}
                    options={hearingTypeOptions}
                    onChange={(value) => {
                      if (value === 'all') {
                        updateFilters({ hearingTypes: [] });
                      } else {
                        const newTypes = filters.hearingTypes.includes(value)
                          ? filters.hearingTypes.filter(id => id !== value)
                          : [...filters.hearingTypes, value];
                        updateFilters({ hearingTypes: newTypes });
                      }
                    }}
                  />
                </div>

                {/* Status Filter */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Status</Label>
                  <FilterDropdown
                    label="Status"
                    value={filters.statuses.length > 0 ? `${filters.statuses.length} selected` : 'all'}
                    options={statusOptions}
                    onChange={(value) => {
                      if (value === 'all') {
                        updateFilters({ statuses: [] });
                      } else {
                        const newStatuses = filters.statuses.includes(value)
                          ? filters.statuses.filter(id => id !== value)
                          : [...filters.statuses, value];
                        updateFilters({ statuses: newStatuses });
                      }
                    }}
                  />
                </div>

                {/* Internal Counsel Filter */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Internal Counsel</Label>
                  <FilterDropdown
                    label="Counsel"
                    value={filters.internalCounselIds.length > 0 ? `${filters.internalCounselIds.length} selected` : 'all'}
                    options={employeeOptions}
                    onChange={(value) => {
                      if (value === 'all') {
                        updateFilters({ internalCounselIds: [] });
                      } else {
                        const newCounselIds = filters.internalCounselIds.includes(value)
                          ? filters.internalCounselIds.filter(id => id !== value)
                          : [...filters.internalCounselIds, value];
                        updateFilters({ internalCounselIds: newCounselIds });
                      }
                    }}
                  />
                </div>

                {/* Date Range Filter */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Date Range</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        {filters.dateRange?.from ? (
                          filters.dateRange.to ? (
                            <>
                              {format(filters.dateRange.from, "LLL dd")} -{" "}
                              {format(filters.dateRange.to, "LLL dd")}
                            </>
                          ) : (
                            format(filters.dateRange.from, "LLL dd")
                          )
                        ) : (
                          <span>Pick a date range</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={filters.dateRange?.from}
                        selected={filters.dateRange}
                        onSelect={(range) => updateFilters({ dateRange: range })}
                        numberOfMonths={2}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

              </div>
            </>
          )}

          {/* Active Filter Tags */}
          {getActiveFilterCount() > 0 && (
            <>
              <Separator className="my-4" />
              <div className="flex flex-wrap gap-2">
                {filters.searchTerm && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Search: {filters.searchTerm}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => updateFilters({ searchTerm: '' })}
                    />
                  </Badge>
                )}
                
                {filters.clientIds.length > 0 && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Clients: {filters.clientIds.length}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => updateFilters({ clientIds: [] })}
                    />
                  </Badge>
                )}
                
                {filters.caseIds.length > 0 && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Cases: {filters.caseIds.length}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => updateFilters({ caseIds: [] })}
                    />
                  </Badge>
                )}
                
                {filters.courtIds.length > 0 && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Courts: {filters.courtIds.length}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => updateFilters({ courtIds: [] })}
                    />
                  </Badge>
                )}
                
                {filters.judgeIds.length > 0 && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Judges: {filters.judgeIds.length}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => updateFilters({ judgeIds: [] })}
                    />
                  </Badge>
                )}
                
                {filters.hearingTypes.length > 0 && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Types: {filters.hearingTypes.length}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => updateFilters({ hearingTypes: [] })}
                    />
                  </Badge>
                )}
                
                {filters.statuses.length > 0 && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Status: {filters.statuses.length}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => updateFilters({ statuses: [] })}
                    />
                  </Badge>
                )}
                
                {filters.dateRange && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Date Range
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => updateFilters({ dateRange: undefined })}
                    />
                  </Badge>
                )}
              </div>
            </>
          )}

        </CardContent>
      </Card>
    </div>
  );
};
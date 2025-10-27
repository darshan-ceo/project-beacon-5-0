import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, X, LucideIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FilterDropdown } from '@/components/ui/filter-dropdown';
import { SearchTypeIndicator } from '@/components/search/SearchTypeIndicator';

export interface FilterConfig {
  id: string;
  label: string;
  type: 'dropdown' | 'tags' | 'dateRange' | 'multiSelect';
  icon?: LucideIcon;
  options?: { label: string; value: string }[];
  tags?: { name: string; color?: string }[];
  gridColumn?: 'full' | 'half';
}

interface UnifiedModuleSearchProps {
  moduleName: string;
  moduleIcon: LucideIcon;
  searchPlaceholder?: string;
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  activeFilters: Record<string, any>;
  onFiltersChange: (filters: Record<string, any>) => void;
  filterConfig: FilterConfig[];
  keyboardShortcut?: string;
  showSearchTypeIndicator?: boolean;
}

export const UnifiedModuleSearch: React.FC<UnifiedModuleSearchProps> = ({
  moduleName,
  moduleIcon: ModuleIcon,
  searchPlaceholder = "Search...",
  searchTerm,
  onSearchTermChange,
  activeFilters,
  onFiltersChange,
  filterConfig,
  keyboardShortcut = "Ctrl+F",
  showSearchTypeIndicator = true
}) => {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleFilterChange = (filterType: string, value: string) => {
    const newFilters = { ...activeFilters };
    if (value === 'all') {
      delete newFilters[filterType];
    } else {
      newFilters[filterType] = value;
    }
    onFiltersChange(newFilters);
  };

  const handleTagFilter = (filterId: string, tagName: string) => {
    const currentTags = activeFilters[filterId] || [];
    const newTags = currentTags.includes(tagName)
      ? currentTags.filter((t: string) => t !== tagName)
      : [...currentTags, tagName];
    
    const newFilters = { ...activeFilters };
    if (newTags.length === 0) {
      delete newFilters[filterId];
    } else {
      newFilters[filterId] = newTags;
    }
    onFiltersChange(newFilters);
  };

  const handleDateRangeFilter = (filterId: string) => {
    if (dateRange.from || dateRange.to) {
      const newFilters = {
        ...activeFilters,
        [filterId]: {
          from: dateRange.from?.toISOString(),
          to: dateRange.to?.toISOString()
        }
      };
      onFiltersChange(newFilters);
    }
    setIsAdvancedOpen(false);
  };

  const clearAllFilters = () => {
    onFiltersChange({});
    setDateRange({});
  };

  const removeFilter = (filterType: string, value?: string) => {
    const newFilters = { ...activeFilters };
    
    if (Array.isArray(activeFilters[filterType]) && value) {
      const currentArray = activeFilters[filterType];
      const newArray = currentArray.filter((item: string) => item !== value);
      if (newArray.length === 0) {
        delete newFilters[filterType];
      } else {
        newFilters[filterType] = newArray;
      }
    } else {
      delete newFilters[filterType];
    }
    
    onFiltersChange(newFilters);
    
    if (filterType.includes('dateRange') || filterType.includes('date')) {
      setDateRange({});
    }
  };

  const getActiveFilterCount = () => {
    let count = 0;
    Object.keys(activeFilters).forEach(key => {
      if (Array.isArray(activeFilters[key])) {
        count += activeFilters[key].length;
      } else {
        count += 1;
      }
    });
    return count;
  };

  const renderFilterLabel = (filterId: string, value: any, config: FilterConfig) => {
    if (config.type === 'dropdown' && config.options) {
      const option = config.options.find(opt => opt.value === value);
      return option?.label || value;
    }
    if (config.type === 'dateRange' && typeof value === 'object') {
      return 'Date Range';
    }
    return value;
  };

  return (
    <Card className="p-4 bg-muted/30 border-muted-foreground/20">
      <div className="space-y-4">
        {/* Module Search Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ModuleIcon className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium">{moduleName} Search</h3>
            {showSearchTypeIndicator && (
              <SearchTypeIndicator 
                type="module" 
                moduleName={moduleName}
                icon={ModuleIcon}
                tooltip={`Search only within ${moduleName.toLowerCase()} on this page`}
              />
            )}
            {getActiveFilterCount() > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Filter className="h-3 w-3" />
                  {getActiveFilterCount()} {getActiveFilterCount() === 1 ? 'filter' : 'filters'} active
                </Badge>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearAllFilters}
                  className="h-6 px-2 text-xs"
                >
                  Clear all
                </Button>
              </div>
            )}
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-xs text-muted-foreground border-muted">
                  {keyboardShortcut}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Press {keyboardShortcut} to focus search</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Main Search Bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
              className="pl-10 bg-background focus-visible:ring-primary focus-visible:border-primary"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => onSearchTermChange('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Popover open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="relative">
                      <Filter className="mr-2 h-4 w-4" />
                      Filters
                      {getActiveFilterCount() > 0 && (
                        <Badge variant="secondary" className="ml-2 h-5 min-w-5 text-xs">
                          {getActiveFilterCount()}
                        </Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-96 p-4 z-[9999]" align="end">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{moduleName} Filters</h4>
                        {getActiveFilterCount() > 0 && (
                          <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                            Clear All
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        {filterConfig.map((config) => {
                          if (config.type === 'dropdown' && config.options) {
                            const IconComponent = config.icon;
                            return (
                              <FilterDropdown
                                key={config.id}
                                label={config.label}
                                value={activeFilters[config.id] || 'all'}
                                options={config.options}
                                onChange={(value) => handleFilterChange(config.id, value)}
                                icon={IconComponent ? <IconComponent className="mr-2 h-4 w-4" /> : undefined}
                              />
                            );
                          }
                          return null;
                        })}
                      </div>
                      
                      {/* Tags Section */}
                      {filterConfig.filter(c => c.type === 'tags').map((config) => (
                        <div key={config.id}>
                          <label className="text-sm font-medium mb-2 block">{config.label}</label>
                          <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                            {config.tags?.map((tag) => (
                              <Badge
                                key={tag.name}
                                variant={activeFilters[config.id]?.includes(tag.name) ? "default" : "outline"}
                                className="cursor-pointer text-xs"
                                onClick={() => handleTagFilter(config.id, tag.name)}
                              >
                                {tag.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                      
                      {/* Date Range Section */}
                      {filterConfig.filter(c => c.type === 'dateRange').map((config) => (
                        <div key={config.id}>
                          <label className="text-sm font-medium mb-2 block">{config.label}</label>
                          <div className="flex gap-2">
                            <input
                              type="date"
                              className="px-3 py-2 border rounded-md text-sm bg-background"
                              value={dateRange.from ? dateRange.from.toISOString().split('T')[0] : ''}
                              onChange={(e) => setDateRange(prev => ({ 
                                ...prev, 
                                from: e.target.value ? new Date(e.target.value) : undefined 
                              }))}
                              placeholder="From"
                            />
                            <input
                              type="date"
                              className="px-3 py-2 border rounded-md text-sm bg-background"
                              value={dateRange.to ? dateRange.to.toISOString().split('T')[0] : ''}
                              onChange={(e) => setDateRange(prev => ({ 
                                ...prev, 
                                to: e.target.value ? new Date(e.target.value) : undefined 
                              }))}
                              placeholder="To"
                            />
                          </div>
                          {(dateRange.from || dateRange.to) && (
                            <Button 
                              size="sm" 
                              className="mt-2 w-full" 
                              onClick={() => handleDateRangeFilter(config.id)}
                            >
                              Apply Date Filter
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </TooltipTrigger>
              <TooltipContent>
                <p>Filter {moduleName.toLowerCase()} by various criteria</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Active Filter Chips */}
        {getActiveFilterCount() > 0 && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {Object.keys(activeFilters).map((filterKey) => {
                const config = filterConfig.find(c => c.id === filterKey);
                if (!config) return null;

                const filterValue = activeFilters[filterKey];

                if (Array.isArray(filterValue)) {
                  return filterValue.map((value: string) => (
                    <Badge key={`${filterKey}-${value}`} variant="secondary" className="flex items-center gap-1">
                      {config.label}: {value}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => removeFilter(filterKey, value)}
                      />
                    </Badge>
                  ));
                }

                return (
                  <Badge key={filterKey} variant="secondary" className="flex items-center gap-1">
                    {config.label}: {renderFilterLabel(filterKey, filterValue, config)}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => removeFilter(filterKey)}
                    />
                  </Badge>
                );
              })}
            </div>
            
            {/* Filter Summary Message */}
            <p className="text-xs text-muted-foreground">
              Showing results filtered by {getActiveFilterCount()} {getActiveFilterCount() === 1 ? 'criterion' : 'criteria'}. 
              {searchTerm && ` Search term: "${searchTerm}"`}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};
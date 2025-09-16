import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, X, Tag, User, Calendar as CalendarIcon, FileType } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FilterDropdown } from '@/components/ui/filter-dropdown';
import { dmsService } from '@/services/dmsService';

interface UnifiedDocumentSearchProps {
  onSearch: (query: string) => void;
  onFiltersChange: (filters: any) => void;
  activeFilters: any;
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  placeholder?: string;
}

export const UnifiedDocumentSearch: React.FC<UnifiedDocumentSearchProps> = ({
  onSearch,
  onFiltersChange,
  activeFilters,
  searchTerm,
  onSearchTermChange,
  placeholder = "Search documents by title, tag, content... (Press / for global search)"
}) => {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [tags, setTags] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadTags();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+F focuses document search
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // / key opens global search (handled by header component)
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadTags = async () => {
    try {
      const tagList = await dmsService.tags.list();
      setTags(tagList);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  const handleFilterChange = (filterType: string, value: string) => {
    const newFilters = { ...activeFilters };
    if (value === 'all') {
      delete newFilters[filterType];
    } else {
      newFilters[filterType] = value;
    }
    onFiltersChange(newFilters);
  };

  const handleTagFilter = (tagName: string) => {
    const currentTags = activeFilters.tags || [];
    const newTags = currentTags.includes(tagName)
      ? currentTags.filter((t: string) => t !== tagName)
      : [...currentTags, tagName];
    
    const newFilters = { ...activeFilters };
    if (newTags.length === 0) {
      delete newFilters.tags;
    } else {
      newFilters.tags = newTags;
    }
    onFiltersChange(newFilters);
  };

  const handleDateRangeFilter = () => {
    if (dateRange.from || dateRange.to) {
      const newFilters = {
        ...activeFilters,
        dateRange: {
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
    
    if (filterType === 'tags' && value) {
      const currentTags = activeFilters.tags || [];
      const newTags = currentTags.filter((t: string) => t !== value);
      if (newTags.length === 0) {
        delete newFilters.tags;
      } else {
        newFilters.tags = newTags;
      }
    } else {
      delete newFilters[filterType];
    }
    
    onFiltersChange(newFilters);
    
    if (filterType === 'dateRange') {
      setDateRange({});
    }
  };

  const getActiveFilterCount = () => {
    let count = 0;
    Object.keys(activeFilters).forEach(key => {
      if (key === 'tags') {
        count += activeFilters.tags?.length || 0;
      } else {
        count += 1;
      }
    });
    return count;
  };

  const fileTypeOptions = [
    { label: 'PDF', value: 'pdf' },
    { label: 'Word', value: 'doc' },
    { label: 'Excel', value: 'xlsx' },
    { label: 'Image', value: 'jpg' }
  ];

  const caseOptions = [
    { label: 'GST-2024-001', value: 'gst-2024-001' },
    { label: 'Income Tax-2024-002', value: 'it-2024-002' },
    { label: 'Corporate-2024-003', value: 'corp-2024-003' }
  ];

  const uploaderOptions = [
    { label: 'John Doe', value: 'john-doe' },
    { label: 'Jane Smith', value: 'jane-smith' },
    { label: 'Mike Johnson', value: 'mike-johnson' }
  ];

  return (
    <div className="space-y-4">
      {/* Main Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => {
              onSearchTermChange(e.target.value);
              onSearch(e.target.value);
            }}
            className="pl-10"
          />
        </div>
        
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
          <PopoverContent className="w-80 p-4" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Advanced Filters</h4>
                {getActiveFilterCount() > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                    Clear All
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <FilterDropdown
                  label="Type"
                  value={activeFilters.fileType || 'all'}
                  options={fileTypeOptions}
                  onChange={(value) => handleFilterChange('fileType', value)}
                  icon={<FileType className="mr-2 h-4 w-4" />}
                />
                
                <FilterDropdown
                  label="Case"
                  value={activeFilters.caseId || 'all'}
                  options={caseOptions}
                  onChange={(value) => handleFilterChange('caseId', value)}
                  icon={<Tag className="mr-2 h-4 w-4" />}
                />
                
                <FilterDropdown
                  label="Uploader"
                  value={activeFilters.uploadedBy || 'all'}
                  options={uploaderOptions}
                  onChange={(value) => handleFilterChange('uploadedBy', value)}
                  icon={<User className="mr-2 h-4 w-4" />}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Tags</label>
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                  {tags.map((tag) => (
                    <Badge
                      key={tag.name}
                      variant={activeFilters.tags?.includes(tag.name) ? "default" : "outline"}
                      className="cursor-pointer text-xs"
                      onClick={() => handleTagFilter(tag.name)}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Date Range</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    className="px-3 py-2 border rounded-md text-sm"
                    value={dateRange.from ? dateRange.from.toISOString().split('T')[0] : ''}
                    onChange={(e) => setDateRange(prev => ({ 
                      ...prev, 
                      from: e.target.value ? new Date(e.target.value) : undefined 
                    }))}
                    placeholder="From"
                  />
                  <input
                    type="date"
                    className="px-3 py-2 border rounded-md text-sm"
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
                    onClick={handleDateRangeFilter}
                  >
                    Apply Date Filter
                  </Button>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active Filter Chips */}
      {getActiveFilterCount() > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.fileType && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Type: {activeFilters.fileType}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => removeFilter('fileType')}
              />
            </Badge>
          )}
          
          {activeFilters.caseId && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Case: {activeFilters.caseId}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => removeFilter('caseId')}
              />
            </Badge>
          )}
          
          {activeFilters.uploadedBy && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Uploader: {activeFilters.uploadedBy}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => removeFilter('uploadedBy')}
              />
            </Badge>
          )}
          
          {activeFilters.tags?.map((tag: string) => (
            <Badge key={tag} variant="secondary" className="flex items-center gap-1">
              <Tag className="h-3 w-3" />
              {tag}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => removeFilter('tags', tag)}
              />
            </Badge>
          ))}
          
          {activeFilters.dateRange && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <CalendarIcon className="h-3 w-3" />
              Date Range
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => removeFilter('dateRange')}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};
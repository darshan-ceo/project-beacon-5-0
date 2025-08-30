import React, { useState, useEffect } from 'react';
import { FilterDropdown } from '@/components/ui/filter-dropdown';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { dmsService } from '@/services/dmsService';
import { useAppState } from '@/contexts/AppStateContext';
import { 
  Filter, 
  Calendar as CalendarIcon, 
  X,
  FileType,
  Users,
  Building
} from 'lucide-react';
import { format } from 'date-fns';

interface DocumentFiltersProps {
  onFiltersChange: (filters: any) => void;
  activeFilters: any;
}

export const DocumentFilters: React.FC<DocumentFiltersProps> = ({
  onFiltersChange,
  activeFilters
}) => {
  const { state } = useAppState();
  const [isOpen, setIsOpen] = useState(false);
  const [tags, setTags] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<{start?: Date, end?: Date}>({});

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      const tagList = await dmsService.tags.list();
      setTags(tagList);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  const fileTypeOptions = [
    { label: 'PDF Documents', value: 'pdf' },
    { label: 'Word Documents', value: 'docx' },
    { label: 'Excel Spreadsheets', value: 'xlsx' },
    { label: 'Images', value: 'image' },
    { label: 'All Types', value: 'all' }
  ];

  const caseOptions = state.cases.map(c => ({
    label: `${c.caseNumber} - ${c.title}`,
    value: c.id
  }));

  const uploaderOptions = state.employees.map(e => ({
    label: e.name,
    value: e.id
  }));

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
    if (dateRange.start && dateRange.end) {
      const newFilters = {
        ...activeFilters,
        dateRange: {
          start: format(dateRange.start, 'yyyy-MM-dd'),
          end: format(dateRange.end, 'yyyy-MM-dd')
        }
      };
      onFiltersChange(newFilters);
    }
    setIsOpen(false);
  };

  const clearAllFilters = () => {
    setDateRange({});
    onFiltersChange({});
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (activeFilters.caseId) count++;
    if (activeFilters.fileType) count++;
    if (activeFilters.uploadedBy) count++;
    if (activeFilters.tags?.length > 0) count++;
    if (activeFilters.dateRange) count++;
    return count;
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* File Type Filter */}
      <FilterDropdown
        label="Type"
        value={activeFilters.fileType || 'all'}
        options={fileTypeOptions}
        onChange={(value) => handleFilterChange('fileType', value)}
        icon={<FileType className="mr-2 h-4 w-4" />}
      />

      {/* Case Filter */}
      <FilterDropdown
        label="Case"
        value={activeFilters.caseId || 'all'}
        options={caseOptions}
        onChange={(value) => handleFilterChange('caseId', value)}
        icon={<Building className="mr-2 h-4 w-4" />}
      />

      {/* Uploader Filter */}
      <FilterDropdown
        label="Uploader"
        value={activeFilters.uploadedBy || 'all'}
        options={uploaderOptions}
        onChange={(value) => handleFilterChange('uploadedBy', value)}
        icon={<Users className="mr-2 h-4 w-4" />}
      />

      {/* Advanced Filters */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="relative">
            <Filter className="mr-2 h-4 w-4" />
            More Filters
            {getActiveFilterCount() > 0 && (
              <Badge 
                variant="secondary" 
                className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {getActiveFilterCount()}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Tags</Label>
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant={activeFilters.tags?.includes(tag.name) ? "default" : "outline"}
                    className="cursor-pointer hover:bg-primary/80"
                    onClick={() => handleTagFilter(tag.name)}
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Date Range</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  type="date"
                  value={dateRange.start ? format(dateRange.start, 'yyyy-MM-dd') : ''}
                  onChange={(e) => setDateRange(prev => ({ 
                    ...prev, 
                    start: e.target.value ? new Date(e.target.value) : undefined 
                  }))}
                  placeholder="Start date"
                />
                <Input
                  type="date"
                  value={dateRange.end ? format(dateRange.end, 'yyyy-MM-dd') : ''}
                  onChange={(e) => setDateRange(prev => ({ 
                    ...prev, 
                    end: e.target.value ? new Date(e.target.value) : undefined 
                  }))}
                  placeholder="End date"
                />
              </div>
              {(dateRange.start || dateRange.end) && (
                <Button
                  size="sm"
                  className="mt-2"
                  onClick={handleDateRangeFilter}
                  disabled={!dateRange.start || !dateRange.end}
                >
                  Apply Date Range
                </Button>
              )}
            </div>

            <div className="flex justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                disabled={getActiveFilterCount() === 0}
              >
                <X className="mr-1 h-3 w-3" />
                Clear All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active Filter Tags */}
      {activeFilters.tags?.map((tag: string) => (
        <Badge
          key={tag}
          variant="secondary"
          className="cursor-pointer"
          onClick={() => handleTagFilter(tag)}
        >
          {tag}
          <X className="ml-1 h-3 w-3" />
        </Badge>
      ))}

      {activeFilters.dateRange && (
        <Badge
          variant="secondary"
          className="cursor-pointer"
          onClick={() => handleFilterChange('dateRange', 'all')}
        >
          {format(new Date(activeFilters.dateRange.start), 'MMM dd')} - {format(new Date(activeFilters.dateRange.end), 'MMM dd')}
          <X className="ml-1 h-3 w-3" />
        </Badge>
      )}
    </div>
  );
};
/**
 * Due Date Filter Component
 * Replaces "coming soon" with working date filter functionality
 */

import React, { useState } from 'react';
import { Calendar, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { 
  DueDateFilter, 
  getDueDateFilters, 
  DateRange,
  dueDateFilterToUrl,
  parseDueDateFromUrl
} from '@/utils/date';

interface DueDateFilterProps {
  value?: DueDateFilter | null;
  onChange: (filter: DueDateFilter | null) => void;
  className?: string;
}

export const DueDateFilterComponent: React.FC<DueDateFilterProps> = ({ 
  value, 
  onChange, 
  className 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customRange, setCustomRange] = useState<{ from?: Date; to?: Date }>({});
  const [showCustomCalendar, setShowCustomCalendar] = useState(false);

  const predefinedFilters = getDueDateFilters();

  const handleFilterSelect = (filter: DueDateFilter) => {
    if (filter.type === 'custom') {
      setShowCustomCalendar(true);
    } else {
      onChange(filter);
      setIsOpen(false);
    }
  };

  const handleCustomRangeSubmit = () => {
    if (customRange.from && customRange.to) {
      const customFilter: DueDateFilter = {
        type: 'custom',
        range: { from: customRange.from, to: customRange.to },
        label: `${customRange.from.toLocaleDateString()} - ${customRange.to.toLocaleDateString()}`
      };
      onChange(customFilter);
      setShowCustomCalendar(false);
      setIsOpen(false);
    }
  };

  const clearFilter = () => {
    onChange(null);
    setIsOpen(false);
  };

  const getFilterColor = (filterType: string) => {
    switch (filterType) {
      case 'today': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'tomorrow': return 'bg-green-50 text-green-700 border-green-200';
      case 'overdue': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-purple-50 text-purple-700 border-purple-200';
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-9 border-dashed"
          >
            <Calendar className="mr-2 h-4 w-4" />
            Due Date
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          {!showCustomCalendar ? (
            <Command>
              <CommandInput placeholder="Search due date filters..." />
              <CommandList>
                <CommandEmpty>No filters found.</CommandEmpty>
                <CommandGroup>
                  {predefinedFilters.map((filter) => (
                    <CommandItem
                      key={filter.type}
                      onSelect={() => handleFilterSelect(filter)}
                      className="cursor-pointer"
                    >
                      <span>{filter.label}</span>
                    </CommandItem>
                  ))}
                  <CommandItem
                    onSelect={() => setShowCustomCalendar(true)}
                    className="cursor-pointer"
                  >
                    <span>Custom Range...</span>
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          ) : (
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Select Date Range</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">From</p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full justify-start">
                          {customRange.from ? 
                            customRange.from.toLocaleDateString() : 
                            'Start date'
                          }
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={customRange.from}
                          onSelect={(date) => setCustomRange(prev => ({ ...prev, from: date }))}
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">To</p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full justify-start">
                          {customRange.to ? 
                            customRange.to.toLocaleDateString() : 
                            'End date'
                          }
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={customRange.to}
                          onSelect={(date) => setCustomRange(prev => ({ ...prev, to: date }))}
                          disabled={(date) => customRange.from ? date < customRange.from : false}
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
              <div className="flex justify-between">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowCustomCalendar(false)}
                >
                  Back
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleCustomRangeSubmit}
                  disabled={!customRange.from || !customRange.to}
                >
                  Apply Range
                </Button>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Active Filter Display */}
      {value && (
        <Badge 
          variant="secondary" 
          className={cn("gap-1", getFilterColor(value.type))}
        >
          <Calendar className="h-3 w-3" />
          {value.label}
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-0 ml-1 hover:bg-transparent"
            onClick={clearFilter}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      )}
    </div>
  );
};
import React from 'react';
import { CalendarIcon, X } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatDateForDisplay, parseDateInput } from '@/utils/dateFormatters';

interface DatePickerWithRangeProps {
  date?: DateRange;
  onDateChange?: (date: DateRange | undefined) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Show Clear and Today action buttons */
  showActions?: boolean;
}

/**
 * Standardized date range picker for Project Beacon
 * - Displays dates in DD-MM-YYYY format
 * - Consistent shadcn Calendar + Popover behavior
 * - Clear and Today action buttons
 * - Works on desktop, tablet, and mobile
 */
export function DatePickerWithRange({
  date,
  onDateChange,
  className,
  placeholder = 'Pick a date range',
  disabled = false,
  showActions = true,
}: DatePickerWithRangeProps) {
  const [open, setOpen] = React.useState(false);

  const handleClear = () => {
    if (onDateChange) {
      onDateChange(undefined);
    }
  };

  const handleToday = () => {
    if (onDateChange) {
      const today = new Date();
      onDateChange({ from: today, to: today });
    }
  };

  const handleThisWeek = () => {
    if (onDateChange) {
      const today = new Date();
      const weekEnd = new Date(today);
      weekEnd.setDate(today.getDate() + 7);
      onDateChange({ from: today, to: weekEnd });
    }
  };

  // Format display text
  const getDisplayText = () => {
    if (!date?.from) return placeholder;
    
    if (date.to) {
      return `${formatDateForDisplay(date.from)} - ${formatDateForDisplay(date.to)}`;
    }
    
    return formatDateForDisplay(date.from);
  };

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            disabled={disabled}
            className={cn(
              'w-[300px] justify-start text-left font-normal h-9',
              !date && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
            <span className="truncate">{getDisplayText()}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={onDateChange}
            numberOfMonths={2}
            className="pointer-events-auto"
          />
          {showActions && (
            <div className="flex justify-between items-center p-2 border-t">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                disabled={!date}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleToday}
                  className="text-primary hover:text-primary"
                >
                  Today
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleThisWeek}
                  className="text-primary hover:text-primary"
                >
                  This Week
                </Button>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

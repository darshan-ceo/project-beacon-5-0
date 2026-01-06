import React from 'react';
import { CalendarIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatDateForDisplay, formatDateForInput, parseDateInput } from '@/utils/dateFormatters';

interface DateInputProps {
  value?: string | Date;
  onChange?: (date: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
  min?: string | Date;
  max?: string | Date;
  /** Show Clear and Today action buttons */
  showActions?: boolean;
  /** ID for form association */
  id?: string;
}

/**
 * Standardized date input component for Project Beacon
 * - Displays dates in DD-MM-YYYY format
 * - Stores dates in YYYY-MM-DD (ISO) format
 * - Consistent shadcn Calendar + Popover behavior
 * - Clear and Today action buttons
 * - Works on desktop, tablet, and mobile
 */
export function DateInput({
  value,
  onChange,
  placeholder = 'DD-MM-YYYY',
  disabled = false,
  className,
  required = false,
  min,
  max,
  showActions = true,
  id,
}: DateInputProps) {
  const [open, setOpen] = React.useState(false);

  const parsedDate = parseDateInput(value);
  const displayValue = parsedDate ? formatDateForDisplay(parsedDate) : '';

  // Parse min/max dates for calendar disabled logic
  const minDate = min ? parseDateInput(min) : undefined;
  const maxDate = max ? parseDateInput(max) : undefined;

  const handleDateSelect = (date: Date | undefined) => {
    if (date && onChange) {
      onChange(formatDateForInput(date));
      setOpen(false);
    }
  };

  const handleClear = () => {
    if (onChange) {
      onChange('');
    }
  };

  const handleToday = () => {
    if (onChange) {
      onChange(formatDateForInput(new Date()));
      setOpen(false);
    }
  };

  // Disable dates outside min/max range
  const disabledDays = (date: Date) => {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal h-9',
            !value && 'text-muted-foreground',
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
          <span className="truncate">{displayValue || placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={parsedDate || undefined}
          onSelect={handleDateSelect}
          disabled={disabledDays}
          initialFocus
          className="pointer-events-auto"
        />
        {showActions && (
          <div className="flex justify-between items-center p-2 border-t">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={!value}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleToday}
              className="text-primary hover:text-primary"
            >
              Today
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

/**
 * Simple native date input wrapper that shows DD-MM-YYYY placeholder
 * Use this when you need the native date picker behavior
 * @deprecated Use DateInput instead for consistent UX
 */
export function NativeDateInput({
  value,
  onChange,
  placeholder = 'DD-MM-YYYY',
  disabled = false,
  className,
  required = false,
  min,
  max,
}: DateInputProps) {
  const inputValue = value ? formatDateForInput(value) : '';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  return (
    <input
      type="date"
      value={inputValue}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      min={min ? formatDateForInput(min) : undefined}
      max={max ? formatDateForInput(max) : undefined}
      className={cn(
        'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
    />
  );
}

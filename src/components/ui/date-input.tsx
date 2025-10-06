import React from 'react';
import { CalendarIcon } from 'lucide-react';
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
  min?: string;
  max?: string;
}

/**
 * Custom date input component that displays DD-MM-YYYY format
 * but stores/handles YYYY-MM-DD internally for HTML5 compatibility
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
}: DateInputProps) {
  const [open, setOpen] = React.useState(false);

  const parsedDate = parseDateInput(value);
  const displayValue = parsedDate ? formatDateForDisplay(parsedDate) : '';
  const inputValue = parsedDate ? formatDateForInput(parsedDate) : '';

  const handleDateSelect = (date: Date | undefined) => {
    if (date && onChange) {
      onChange(formatDateForInput(date));
      setOpen(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayValue || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={parsedDate || undefined}
          onSelect={handleDateSelect}
          disabled={disabled}
          initialFocus
        />
      </PopoverContent>
      {/* Hidden native input for form compatibility */}
      <input
        type="date"
        value={inputValue}
        onChange={handleInputChange}
        disabled={disabled}
        required={required}
        min={min}
        max={max}
        className="sr-only"
        aria-label={placeholder}
      />
    </Popover>
  );
}

/**
 * Simple native date input wrapper that shows DD-MM-YYYY placeholder
 * Use this when you need the native date picker behavior
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
      min={min}
      max={max}
      className={cn(
        'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
    />
  );
}

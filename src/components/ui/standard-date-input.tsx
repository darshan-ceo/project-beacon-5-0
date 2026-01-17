import React, { useState, useRef, useEffect } from 'react';
import { CalendarIcon } from 'lucide-react';
import { format, parse, isValid } from 'date-fns';
import { enGB } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { formatDateForStorage, parseDateInput, formatDateForDisplay } from '@/utils/dateFormatters';

export interface StandardDateInputProps {
  id?: string;
  value?: string | Date | null;
  onChange?: (isoDate: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  min?: string | Date;
  max?: string | Date;
  error?: boolean;
  className?: string;
  /** Show year dropdown for DOB/historical dates */
  showYearDropdown?: boolean;
  /** Year range for dropdown (default: 1924 to current year) */
  fromYear?: number;
  toYear?: number;
}

/**
 * StandardDateInput - Unified date input component
 * 
 * Features:
 * - Native HTML5 date input for direct keyboard entry (dd/mm/yyyy)
 * - Calendar picker icon for alternative selection
 * - Display format: DD-MM-YYYY
 * - Storage format: YYYY-MM-DD (ISO)
 * - Works consistently on desktop, tablet, and mobile
 */
export const StandardDateInput: React.FC<StandardDateInputProps> = ({
  id,
  value,
  onChange,
  placeholder = 'dd-mm-yyyy',
  disabled = false,
  required = false,
  min,
  max,
  error = false,
  className,
  showYearDropdown = false,
  fromYear = 1924,
  toYear = new Date().getFullYear(),
}) => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Convert value to ISO format for native input (YYYY-MM-DD)
  const getIsoValue = (): string => {
    if (!value) return '';
    const parsed = parseDateInput(value);
    if (!parsed) return '';
    return formatDateForStorage(parsed);
  };

  // Convert value to display format (DD-MM-YYYY)
  const getDisplayValue = (): string => {
    if (!value) return '';
    const parsed = parseDateInput(value);
    if (!parsed) return '';
    return formatDateForDisplay(parsed);
  };

  // Convert min/max to ISO format for native input
  const getMinIso = (): string | undefined => {
    if (!min) return undefined;
    const parsed = parseDateInput(min);
    return parsed ? formatDateForStorage(parsed) : undefined;
  };

  const getMaxIso = (): string | undefined => {
    if (!max) return undefined;
    const parsed = parseDateInput(max);
    return parsed ? formatDateForStorage(parsed) : undefined;
  };

  // Handle native date input change
  const handleNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isoValue = e.target.value; // Native input returns YYYY-MM-DD
    if (onChange) {
      onChange(isoValue);
    }
  };

  // Handle calendar selection
  const handleCalendarSelect = (date: Date | undefined) => {
    if (date && onChange) {
      onChange(formatDateForStorage(date));
    }
    setIsCalendarOpen(false);
  };

  // Get selected date for calendar
  const getSelectedDate = (): Date | undefined => {
    if (!value) return undefined;
    const parsed = parseDateInput(value);
    return parsed || undefined;
  };

  // Convert min/max to Date for calendar disable logic
  const getMinDate = (): Date | undefined => {
    if (!min) return undefined;
    return parseDateInput(min) || undefined;
  };

  const getMaxDate = (): Date | undefined => {
    if (!max) return undefined;
    return parseDateInput(max) || undefined;
  };

  return (
    <div className={cn('relative flex items-center', className)}>
      {/* Native date input - allows direct keyboard entry */}
      <Input
        ref={inputRef}
        id={id}
        type="date"
        value={getIsoValue()}
        onChange={handleNativeChange}
        disabled={disabled}
        required={required}
        min={getMinIso()}
        max={getMaxIso()}
        className={cn(
          'pr-10',
          // Hide native calendar icon to avoid duplicate icons
          '[&::-webkit-calendar-picker-indicator]:hidden',
          '[&::-webkit-inner-spin-button]:hidden',
          error && 'border-destructive focus-visible:ring-destructive'
        )}
        placeholder={placeholder}
      />
      
      {/* Calendar picker button */}
      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 h-full px-3 hover:bg-transparent"
            disabled={disabled}
            onClick={() => setIsCalendarOpen(true)}
          >
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={getSelectedDate()}
            onSelect={handleCalendarSelect}
            disabled={(date) => {
              const minDate = getMinDate();
              const maxDate = getMaxDate();
              if (minDate && date < minDate) return true;
              if (maxDate && date > maxDate) return true;
              return false;
            }}
            initialFocus
            captionLayout={showYearDropdown ? "dropdown-buttons" : "buttons"}
            fromYear={showYearDropdown ? fromYear : undefined}
            toYear={showYearDropdown ? toYear : undefined}
            className="pointer-events-auto"
            locale={enGB}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default StandardDateInput;

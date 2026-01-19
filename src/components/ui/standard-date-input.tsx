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
 * - Text input for keyboard entry (dd-mm-yyyy format)
 * - Calendar picker icon for alternative selection
 * - Display format: DD-MM-YYYY
 * - Storage format: YYYY-MM-DD (ISO)
 * - No native browser calendar icon (uses type="text")
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
  const [textValue, setTextValue] = useState('');
  const [hasError, setHasError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync textValue with external value prop
  useEffect(() => {
    if (!value) {
      setTextValue('');
      return;
    }
    const parsed = parseDateInput(value);
    if (parsed) {
      setTextValue(formatDateForDisplay(parsed));
    } else {
      setTextValue('');
    }
  }, [value]);

  // Parse text input and validate date
  const parseTextDate = (text: string): Date | null => {
    if (!text.trim()) return null;
    
    // Normalize separators: accept dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy
    const normalized = text.replace(/[/.]/g, '-');
    
    // Try parsing as dd-mm-yyyy
    const ddmmyyyy = parse(normalized, 'dd-MM-yyyy', new Date());
    if (isValid(ddmmyyyy)) {
      return ddmmyyyy;
    }
    
    // Try parsing as yyyy-mm-dd (ISO format, in case user pastes)
    const yyyymmdd = parse(normalized, 'yyyy-MM-dd', new Date());
    if (isValid(yyyymmdd)) {
      return yyyymmdd;
    }
    
    return null;
  };

  // Validate date against min/max
  const validateDate = (date: Date): boolean => {
    const minDate = min ? parseDateInput(min) : null;
    const maxDate = max ? parseDateInput(max) : null;
    
    if (minDate && date < minDate) return false;
    if (maxDate && date > maxDate) return false;
    
    return true;
  };

  // Handle text input change
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setTextValue(newValue);
    setHasError(false);
  };

  // Handle blur - parse and validate
  const handleBlur = () => {
    if (!textValue.trim()) {
      // Empty is valid (unless required, but that's form-level validation)
      if (onChange) onChange('');
      setHasError(false);
      return;
    }

    const parsed = parseTextDate(textValue);
    
    if (!parsed) {
      setHasError(true);
      return;
    }

    if (!validateDate(parsed)) {
      setHasError(true);
      return;
    }

    // Valid date - update display and call onChange
    setTextValue(formatDateForDisplay(parsed));
    setHasError(false);
    if (onChange) {
      onChange(formatDateForStorage(parsed));
    }
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBlur();
    }
  };

  // Handle calendar selection
  const handleCalendarSelect = (date: Date | undefined) => {
    if (date && onChange) {
      setTextValue(formatDateForDisplay(date));
      setHasError(false);
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
      {/* Text input - no native calendar icon */}
      <Input
        ref={inputRef}
        id={id}
        type="text"
        value={textValue}
        onChange={handleTextChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        required={required}
        className={cn(
          'pr-10',
          (error || hasError) && 'border-destructive focus-visible:ring-destructive'
        )}
        placeholder={placeholder}
        autoComplete="off"
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

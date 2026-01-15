import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PHONE_CONFIG, getCountryConfig } from '@/config/phoneConfig';
import { 
  parsePhoneInput, 
  isValidLengthForCountry, 
  isIncompleteNumber, 
  cleanPhoneInput,
  isNumberInList 
} from '@/utils/phoneUtils';
import { 
  checkPhoneDuplicateDebounced, 
  cancelPendingDuplicateCheck,
  DuplicateCheckResult 
} from '@/services/phoneDuplicateService';

export interface PhoneValue {
  countryCode: string;
  number: string;
}

interface PhoneInputProps {
  value: PhoneValue;
  onChange: (value: PhoneValue) => void;
  onValidAdd?: (phone: PhoneValue) => void;
  existingPhones?: Array<{ countryCode: string; number: string }>;
  checkDuplicates?: boolean;
  excludeEntityId?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

type ValidationState = 'idle' | 'valid' | 'duplicate' | 'incomplete' | 'inList';

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  onValidAdd,
  existingPhones = [],
  checkDuplicates = true,
  excludeEntityId,
  disabled = false,
  placeholder = '9876543210',
  className,
  autoFocus = false
}) => {
  const [validationState, setValidationState] = useState<ValidationState>('idle');
  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateCheckResult | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isAddingRef = useRef(false);

  // Check for duplicates when number changes
  useEffect(() => {
    if (!value.number || value.number.length < 5) {
      setValidationState('idle');
      setDuplicateInfo(null);
      return;
    }

    // Check if already in current list
    if (isNumberInList(value.countryCode, value.number, existingPhones)) {
      setValidationState('inList');
      setDuplicateInfo(null);
      return;
    }

    // Check if incomplete
    if (isIncompleteNumber(value.countryCode, value.number)) {
      setValidationState('incomplete');
      setDuplicateInfo(null);
      return;
    }

    // Check if valid length
    if (!isValidLengthForCountry(value.countryCode, value.number)) {
      setValidationState('incomplete');
      setDuplicateInfo(null);
      return;
    }

    // Valid length - check for duplicates
    if (checkDuplicates) {
      checkPhoneDuplicateDebounced(
        value.countryCode,
        value.number,
        (result) => {
          if (result.found) {
            setValidationState('duplicate');
            setDuplicateInfo(result);
          } else {
            setValidationState('valid');
            setDuplicateInfo(null);
          }
        },
        excludeEntityId
      );
    } else {
      setValidationState('valid');
    }

    return () => {
      cancelPendingDuplicateCheck();
    };
  }, [value.countryCode, value.number, existingPhones, checkDuplicates, excludeEntityId]);

  const handleAdd = useCallback(() => {
    if (isAddingRef.current) return;
    if (!value.number || !isValidLengthForCountry(value.countryCode, value.number)) return;
    if (isNumberInList(value.countryCode, value.number, existingPhones)) return;
    
    isAddingRef.current = true;
    onValidAdd?.(value);
    
    // Reset after add
    setTimeout(() => {
      isAddingRef.current = false;
    }, 100);
  }, [value, existingPhones, onValidAdd]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Auto-add on blur if valid
    if (value.number && isValidLengthForCountry(value.countryCode, value.number)) {
      handleAdd();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (pasted) {
      e.preventDefault();
      const parsed = parsePhoneInput(pasted);
      onChange(parsed);
    }
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = cleanPhoneInput(e.target.value);
    onChange({ ...value, number: cleaned });
  };

  const getBorderClass = () => {
    if (!isFocused && !value.number) return '';
    
    switch (validationState) {
      case 'valid':
        return 'border-green-500 focus-within:border-green-500';
      case 'duplicate':
        return 'border-amber-500 focus-within:border-amber-500';
      case 'inList':
        return 'border-amber-400 focus-within:border-amber-400';
      case 'incomplete':
        return '';
      default:
        return '';
    }
  };

  const getStatusIcon = () => {
    switch (validationState) {
      case 'valid':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'duplicate':
      case 'inList':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default:
        return null;
    }
  };

  return (
    <div className={cn('space-y-1', className)}>
      <div className={cn('flex gap-2', getBorderClass())}>
        <Select
          value={value.countryCode}
          onValueChange={(code) => onChange({ ...value, countryCode: code })}
          disabled={disabled}
        >
          <SelectTrigger className="w-[110px] shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PHONE_CONFIG.supportedCountryCodes.map((config) => (
              <SelectItem key={config.code} value={config.code}>
                {config.flag} {config.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            type="tel"
            placeholder={placeholder}
            value={value.number}
            onChange={handleNumberChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            onFocus={() => setIsFocused(true)}
            onPaste={handlePaste}
            disabled={disabled}
            autoFocus={autoFocus}
            className={cn(
              'pr-8',
              validationState === 'valid' && 'border-green-500',
              validationState === 'duplicate' && 'border-amber-500',
              validationState === 'inList' && 'border-amber-400'
            )}
          />
          {value.number && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              {getStatusIcon()}
            </div>
          )}
        </div>
      </div>

      {/* Validation messages */}
      {validationState === 'duplicate' && duplicateInfo && (
        <p className="text-xs text-amber-600 flex items-center gap-1 animate-in fade-in duration-200">
          <AlertTriangle className="h-3 w-3" />
          {PHONE_CONFIG.validationMessages.duplicate(
            duplicateInfo.matches[0]?.entityName || 'Unknown',
            duplicateInfo.matches[0]?.moduleName || 'Unknown'
          )}
        </p>
      )}

      {validationState === 'inList' && (
        <p className="text-xs text-amber-600 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {PHONE_CONFIG.validationMessages.alreadyInList}
        </p>
      )}

      {validationState === 'incomplete' && value.number && (
        <p className="text-xs text-muted-foreground italic">
          {PHONE_CONFIG.validationMessages.incomplete}
        </p>
      )}
    </div>
  );
};

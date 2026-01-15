import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Check, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PHONE_CONFIG, getCountryConfig } from '@/config/phoneConfig';
import { 
  parsePhoneInput, 
  isValidLengthForCountry, 
  isIncompleteNumber, 
  cleanPhoneInput,
  normalizePhone
} from '@/utils/phoneUtils';
import { 
  checkPhoneDuplicateDebounced, 
  cancelPendingDuplicateCheck,
  DuplicateCheckResult 
} from '@/services/phoneDuplicateService';

interface SinglePhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  checkDuplicates?: boolean;
  excludeEntityId?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  required?: boolean;
  defaultCountryCode?: string;
}

type ValidationState = 'idle' | 'valid' | 'duplicate' | 'incomplete';

export const SinglePhoneInput: React.FC<SinglePhoneInputProps> = ({
  value,
  onChange,
  label,
  checkDuplicates = true,
  excludeEntityId,
  disabled = false,
  placeholder = '9876543210',
  className,
  required = false,
  defaultCountryCode = PHONE_CONFIG.defaultCountryCode
}) => {
  const [countryCode, setCountryCode] = useState(defaultCountryCode);
  const [number, setNumber] = useState('');
  const [validationState, setValidationState] = useState<ValidationState>('idle');
  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateCheckResult | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Parse incoming value on mount/change
  useEffect(() => {
    if (value) {
      const parsed = parsePhoneInput(value);
      setCountryCode(parsed.countryCode);
      setNumber(parsed.number);
    } else {
      setNumber('');
    }
  }, [value]);

  // Emit combined value when parts change
  useEffect(() => {
    if (number) {
      onChange(`${countryCode}${number}`);
    } else {
      onChange('');
    }
  }, [countryCode, number, onChange]);

  // Check for duplicates
  useEffect(() => {
    if (!number || number.length < 5) {
      setValidationState('idle');
      setDuplicateInfo(null);
      return;
    }

    if (isIncompleteNumber(countryCode, number)) {
      setValidationState('incomplete');
      setDuplicateInfo(null);
      return;
    }

    if (!isValidLengthForCountry(countryCode, number)) {
      setValidationState('incomplete');
      setDuplicateInfo(null);
      return;
    }

    if (checkDuplicates) {
      checkPhoneDuplicateDebounced(
        countryCode,
        number,
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
  }, [countryCode, number, checkDuplicates, excludeEntityId]);

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = cleanPhoneInput(e.target.value);
    setNumber(cleaned);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (pasted) {
      e.preventDefault();
      const parsed = parsePhoneInput(pasted);
      setCountryCode(parsed.countryCode);
      setNumber(parsed.number);
    }
  };

  const getStatusIcon = () => {
    switch (validationState) {
      case 'valid':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'duplicate':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default:
        return null;
    }
  };

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <Label>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      
      <div className="flex gap-2">
        <Select
          value={countryCode}
          onValueChange={setCountryCode}
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
            type="tel"
            placeholder={placeholder}
            value={number}
            onChange={handleNumberChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onPaste={handlePaste}
            disabled={disabled}
            className={cn(
              'pr-8',
              validationState === 'valid' && 'border-green-500',
              validationState === 'duplicate' && 'border-amber-500'
            )}
          />
          {number && (
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

      {validationState === 'incomplete' && number && (
        <p className="text-xs text-muted-foreground italic">
          {PHONE_CONFIG.validationMessages.incomplete}
        </p>
      )}
    </div>
  );
};

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Check, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EMAIL_CONFIG, isValidEmail, isEmailInList } from '@/config/emailConfig';
import { 
  checkEmailDuplicateDebounced, 
  cancelPendingEmailDuplicateCheck,
  EmailDuplicateCheckResult 
} from '@/services/emailDuplicateService';

interface EmailInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidAdd?: (email: string) => void;
  existingEmails?: Array<{ email: string }>;
  checkDuplicates?: boolean;
  excludeEntityId?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

type ValidationState = 'idle' | 'valid' | 'duplicate' | 'incomplete' | 'inList' | 'invalid';

export const EmailInput: React.FC<EmailInputProps> = ({
  value,
  onChange,
  onValidAdd,
  existingEmails = [],
  checkDuplicates = true,
  excludeEntityId,
  disabled = false,
  placeholder = 'email@example.com',
  className,
  autoFocus = false
}) => {
  const [validationState, setValidationState] = useState<ValidationState>('idle');
  const [duplicateInfo, setDuplicateInfo] = useState<EmailDuplicateCheckResult | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isAddingRef = useRef(false);

  // Check for duplicates when email changes
  useEffect(() => {
    const email = value.trim();
    
    if (!email || email.length < EMAIL_CONFIG.minLengthForCheck) {
      setValidationState('idle');
      setDuplicateInfo(null);
      return;
    }

    // Check if already in current list
    if (isEmailInList(email, existingEmails)) {
      setValidationState('inList');
      setDuplicateInfo(null);
      return;
    }

    // Check if valid format
    if (!isValidEmail(email)) {
      if (email.includes('@')) {
        setValidationState('incomplete');
      } else {
        setValidationState('idle');
      }
      setDuplicateInfo(null);
      return;
    }

    // Valid format - check for duplicates
    if (checkDuplicates) {
      checkEmailDuplicateDebounced(
        email,
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
      cancelPendingEmailDuplicateCheck();
    };
  }, [value, existingEmails, checkDuplicates, excludeEntityId]);

  const handleAdd = useCallback(() => {
    if (isAddingRef.current) return;
    
    const email = value.trim();
    if (!email || !isValidEmail(email)) return;
    if (isEmailInList(email, existingEmails)) return;
    
    isAddingRef.current = true;
    onValidAdd?.(email.toLowerCase());
    
    // Reset after add
    setTimeout(() => {
      isAddingRef.current = false;
    }, 100);
  }, [value, existingEmails, onValidAdd]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Auto-add on blur if valid
    if (value.trim() && isValidEmail(value.trim())) {
      handleAdd();
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
      <div className="relative">
        <Input
          ref={inputRef}
          type="email"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onFocus={() => setIsFocused(true)}
          disabled={disabled}
          autoFocus={autoFocus}
          className={cn(
            'pr-8',
            validationState === 'valid' && 'border-green-500 focus-visible:ring-green-500/25',
            validationState === 'duplicate' && 'border-amber-500 focus-visible:ring-amber-500/25',
            validationState === 'inList' && 'border-amber-400 focus-visible:ring-amber-400/25'
          )}
        />
        {value && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            {getStatusIcon()}
          </div>
        )}
      </div>

      {/* Validation messages */}
      {validationState === 'duplicate' && duplicateInfo && (
        <p className="text-xs text-amber-600 flex items-center gap-1 animate-in fade-in duration-200">
          <AlertTriangle className="h-3 w-3" />
          {EMAIL_CONFIG.validationMessages.duplicate(
            duplicateInfo.matches[0]?.entityName || 'Unknown',
            duplicateInfo.matches[0]?.moduleName || 'Unknown'
          )}
        </p>
      )}

      {validationState === 'inList' && (
        <p className="text-xs text-amber-600 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {EMAIL_CONFIG.validationMessages.alreadyInList}
        </p>
      )}

      {validationState === 'incomplete' && value && (
        <p className="text-xs text-muted-foreground italic">
          {EMAIL_CONFIG.validationMessages.incomplete}
        </p>
      )}
    </div>
  );
};

/**
 * Text formatting utilities for consistent data entry across the application
 * 
 * DEPRECATED: This file is kept for backward compatibility.
 * Please use @/utils/formatters instead for all new code.
 */

// Re-export from the new formatters module
export { 
  toTitleCase as autoCapitalizeFirst,
  toTitleCase,
  toUpperCase,
  toLowerCase,
  capitalizeFirst
} from './formatters';

/**
 * Apply auto-capitalization on blur event
 * Usage in components:
 * 
 * <Input
 *   value={formData.name}
 *   onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
 *   onBlur={(e) => handleAutoCapitalize(e, (value) => setFormData(prev => ({ ...prev, name: value })))}
 * />
 * 
 * DEPRECATED: Use onBlur with toTitleCase directly instead
 */
export const handleAutoCapitalize = (
  e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>,
  setter: (value: string) => void
) => {
  const { toTitleCase } = require('./formatters');
  const capitalized = toTitleCase(e.target.value);
  if (capitalized !== e.target.value) {
    setter(capitalized);
  }
};

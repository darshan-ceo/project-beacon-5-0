/**
 * Text formatting utilities for consistent data entry across the application
 */

/**
 * Auto-capitalize the first character of a string
 * Examples:
 * - "morbi" → "Morbi"
 * - "new delhi" → "New delhi"
 * - "tata group" → "Tata group"
 */
export const autoCapitalizeFirst = (text: string): string => {
  if (!text || typeof text !== 'string') return text;
  
  // Trim whitespace
  const trimmed = text.trim();
  if (!trimmed) return text;
  
  // Capitalize first letter only
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

/**
 * Apply auto-capitalization on blur event
 * Usage in components:
 * 
 * <Input
 *   value={formData.name}
 *   onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
 *   onBlur={(e) => handleAutoCapitalize(e, (value) => setFormData(prev => ({ ...prev, name: value })))}
 * />
 */
export const handleAutoCapitalize = (
  e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>,
  setter: (value: string) => void
) => {
  const capitalized = autoCapitalizeFirst(e.target.value);
  if (capitalized !== e.target.value) {
    setter(capitalized);
  }
};

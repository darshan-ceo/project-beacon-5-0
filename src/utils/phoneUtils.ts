import { PHONE_CONFIG, getCountryConfig } from '@/config/phoneConfig';

/**
 * Normalize phone number to E.164 format for comparison
 * Removes all non-digit characters except leading +
 */
export const normalizePhone = (countryCode: string, number: string): string => {
  const cleanCode = countryCode.replace(/[^\d+]/g, '');
  const cleanNumber = number.replace(/\D/g, '').replace(/^0+/, ''); // Remove leading zeros
  return `${cleanCode}${cleanNumber}`;
};

/**
 * Parse a pasted phone input and extract country code if present
 */
export const parsePhoneInput = (input: string): { countryCode: string; number: string } => {
  const cleaned = input.trim();
  
  // Check if input starts with + (has country code)
  if (cleaned.startsWith('+')) {
    // Try to match known country codes (sorted by length desc for proper matching)
    const sortedCodes = [...PHONE_CONFIG.supportedCountryCodes]
      .sort((a, b) => b.code.length - a.code.length);
    
    for (const config of sortedCodes) {
      if (cleaned.startsWith(config.code)) {
        const number = cleaned.slice(config.code.length).replace(/\D/g, '');
        return { countryCode: config.code, number };
      }
    }
    
    // Unknown country code, try to extract it
    const match = cleaned.match(/^(\+\d{1,4})(.*)$/);
    if (match) {
      return { 
        countryCode: match[1], 
        number: match[2].replace(/\D/g, '') 
      };
    }
  }
  
  // Check if starts with 00 (international prefix)
  if (cleaned.startsWith('00')) {
    const withPlus = '+' + cleaned.slice(2);
    return parsePhoneInput(withPlus);
  }
  
  // No country code detected, return as-is with default
  return { 
    countryCode: PHONE_CONFIG.defaultCountryCode, 
    number: cleaned.replace(/\D/g, '').replace(/^0+/, '') 
  };
};

/**
 * Check if phone number length is valid for the country
 */
export const isValidLengthForCountry = (countryCode: string, number: string): boolean => {
  const config = getCountryConfig(countryCode);
  if (!config) return number.length >= 7; // Fallback minimum
  
  const cleanNumber = number.replace(/\D/g, '');
  return cleanNumber.length >= config.minLength && cleanNumber.length <= config.maxLength;
};

/**
 * Check if phone number length is within expected range (for incomplete warning)
 */
export const isIncompleteNumber = (countryCode: string, number: string): boolean => {
  const config = getCountryConfig(countryCode);
  if (!config) return false;
  
  const cleanNumber = number.replace(/\D/g, '');
  return cleanNumber.length > 0 && cleanNumber.length < config.minLength;
};

/**
 * Get expected length range for a country code
 */
export const getExpectedLength = (countryCode: string): { min: number; max: number } => {
  const config = getCountryConfig(countryCode);
  if (!config) return { min: 7, max: 15 };
  return { min: config.minLength, max: config.maxLength };
};

/**
 * Format phone number for display (with spaces)
 */
export const formatPhoneForDisplay = (countryCode: string, number: string): string => {
  const cleanNumber = number.replace(/\D/g, '');
  
  // Basic formatting: split into groups
  if (cleanNumber.length <= 4) return cleanNumber;
  if (cleanNumber.length <= 7) {
    return `${cleanNumber.slice(0, 3)} ${cleanNumber.slice(3)}`;
  }
  if (cleanNumber.length <= 10) {
    return `${cleanNumber.slice(0, 3)} ${cleanNumber.slice(3, 6)} ${cleanNumber.slice(6)}`;
  }
  return `${cleanNumber.slice(0, 4)} ${cleanNumber.slice(4, 7)} ${cleanNumber.slice(7)}`;
};

/**
 * Check if a number is already in a list of phones
 */
export const isNumberInList = (
  countryCode: string, 
  number: string, 
  phones: Array<{ countryCode: string; number: string }>
): boolean => {
  const normalized = normalizePhone(countryCode, number);
  return phones.some(p => normalizePhone(p.countryCode, p.number) === normalized);
};

/**
 * Clean phone input (remove non-digits)
 */
export const cleanPhoneInput = (input: string): string => {
  return input.replace(/[^0-9]/g, '');
};

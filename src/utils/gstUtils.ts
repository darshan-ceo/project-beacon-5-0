/**
 * GST Utilities
 * Contains helper functions for GSTIN validation and PAN extraction
 */

// GSTIN format: 15 chars where chars 3-12 (index 2-11) = PAN
// Example: 07AABCU9603R1ZV → AABCU9603R
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

/**
 * Validate GSTIN format
 */
export const isValidGSTIN = (gstin: string): boolean => {
  const trimmed = gstin?.trim()?.toUpperCase();
  if (!trimmed || trimmed.length !== 15) return false;
  return GSTIN_REGEX.test(trimmed);
};

/**
 * Validate PAN format
 */
export const isValidPAN = (pan: string): boolean => {
  const trimmed = pan?.trim()?.toUpperCase();
  if (!trimmed || trimmed.length !== 10) return false;
  return PAN_REGEX.test(trimmed);
};

/**
 * Extract PAN from valid GSTIN
 * GSTIN format: 15 chars where chars 3-12 (index 2-11) = PAN
 * Example: 07AABCU9603R1ZV → AABCU9603R
 * 
 * @param gstin - The GSTIN to extract PAN from
 * @returns The extracted PAN or null if GSTIN is invalid
 */
export const extractPANFromGSTIN = (gstin: string): string | null => {
  const trimmed = gstin?.trim()?.toUpperCase();
  if (!trimmed || trimmed.length !== 15) return null;
  
  // Validate GSTIN format first
  if (!GSTIN_REGEX.test(trimmed)) return null;
  
  const extractedPAN = trimmed.substring(2, 12);
  
  // Validate extracted PAN format
  if (!PAN_REGEX.test(extractedPAN)) return null;
  
  return extractedPAN;
};

/**
 * Check if PAN matches the PAN derived from GSTIN
 * Returns true if:
 * - Either value is empty (no validation needed)
 * - PAN matches the derived PAN from GSTIN
 * 
 * @param gstin - The GSTIN to derive PAN from
 * @param pan - The PAN to validate against
 * @returns true if consistent, false if mismatch detected
 */
export const validateGSTINPANConsistency = (gstin: string, pan: string): boolean => {
  const trimmedGstin = gstin?.trim()?.toUpperCase();
  const trimmedPan = pan?.trim()?.toUpperCase();
  
  // No validation needed if either is empty
  if (!trimmedGstin || !trimmedPan) return true;
  
  // If GSTIN is invalid, skip validation
  if (!isValidGSTIN(trimmedGstin)) return true;
  
  const derivedPAN = extractPANFromGSTIN(trimmedGstin);
  
  // If we couldn't extract PAN, skip validation
  if (!derivedPAN) return true;
  
  return derivedPAN === trimmedPan;
};

/**
 * Get the derived PAN from GSTIN with mismatch info
 * Useful for warning messages
 */
export const getPANMismatchInfo = (gstin: string, pan: string): {
  isValid: boolean;
  derivedPAN: string | null;
  currentPAN: string;
  hasMismatch: boolean;
} => {
  const trimmedGstin = gstin?.trim()?.toUpperCase() || '';
  const trimmedPan = pan?.trim()?.toUpperCase() || '';
  const derivedPAN = extractPANFromGSTIN(trimmedGstin);
  
  return {
    isValid: !trimmedGstin || !trimmedPan || !derivedPAN || derivedPAN === trimmedPan,
    derivedPAN,
    currentPAN: trimmedPan,
    hasMismatch: !!derivedPAN && !!trimmedPan && derivedPAN !== trimmedPan
  };
};

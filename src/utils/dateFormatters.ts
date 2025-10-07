/**
 * Centralized Date Formatting Utilities
 * Ensures consistent DD-MM-YYYY format across the application
 */

import { format, parse, isValid, parseISO } from 'date-fns';
import { enGB } from 'date-fns/locale';

// Date format constants
export const DATE_FORMATS = {
  DISPLAY: 'dd-MM-yyyy',        // 29-04-2023
  DISPLAY_SHORT: 'dd/MM/yyyy',  // 29/04/2023
  DISPLAY_LONG: 'dd MMM yyyy',  // 29 Apr 2023
  INPUT: 'yyyy-MM-dd',          // 2023-04-29 (HTML5 input requirement)
  ISO: 'yyyy-MM-dd',            // For database storage
} as const;

/**
 * Parse a date from various input formats
 */
export function parseDateInput(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  
  if (value instanceof Date) {
    return isValid(value) ? value : null;
  }

  // Try DD-MM-YYYY format
  let parsed = parse(value, 'dd-MM-yyyy', new Date());
  if (isValid(parsed)) return parsed;

  // Try DD/MM/YYYY format
  parsed = parse(value, 'dd/MM/yyyy', new Date());
  if (isValid(parsed)) return parsed;

  // Try YYYY-MM-DD format (ISO/HTML5)
  parsed = parse(value, 'yyyy-MM-dd', new Date());
  if (isValid(parsed)) return parsed;

  // Try ISO string
  try {
    parsed = parseISO(value);
    if (isValid(parsed)) return parsed;
  } catch (e) {
    // Continue to next attempt
  }

  // Try native Date parsing as last resort
  parsed = new Date(value);
  return isValid(parsed) ? parsed : null;
}

/**
 * Format date for display in tables and cards (DD-MM-YYYY)
 */
export function formatDateForDisplay(date: string | Date | null | undefined): string {
  const parsed = parseDateInput(date);
  if (!parsed) return '';
  return format(parsed, DATE_FORMATS.DISPLAY, { locale: enGB });
}

/**
 * Format date for HTML5 date input (YYYY-MM-DD)
 */
export function formatDateForInput(date: string | Date | null | undefined): string {
  const parsed = parseDateInput(date);
  if (!parsed) return '';
  return format(parsed, DATE_FORMATS.INPUT);
}

/**
 * Format date in long format (29 Apr 2023)
 */
export function formatDateLong(date: string | Date | null | undefined): string {
  const parsed = parseDateInput(date);
  if (!parsed) return '';
  return format(parsed, DATE_FORMATS.DISPLAY_LONG, { locale: enGB });
}

/**
 * Format date in short format with slashes (29/04/2023)
 */
export function formatDateShort(date: string | Date | null | undefined): string {
  const parsed = parseDateInput(date);
  if (!parsed) return '';
  return format(parsed, DATE_FORMATS.DISPLAY_SHORT, { locale: enGB });
}

/**
 * Format date for API/database storage (YYYY-MM-DD)
 */
export function formatDateForStorage(date: string | Date | null | undefined): string {
  const parsed = parseDateInput(date);
  if (!parsed) return '';
  return format(parsed, DATE_FORMATS.ISO);
}

/**
 * Generic date formatter with custom format string
 */
export function formatDate(
  date: string | Date | null | undefined,
  formatString: string = DATE_FORMATS.DISPLAY
): string {
  const parsed = parseDateInput(date);
  if (!parsed) return '';
  return format(parsed, formatString, { locale: enGB });
}

/**
 * Check if a date string is valid
 */
export function isValidDate(date: string | Date | null | undefined): boolean {
  const parsed = parseDateInput(date);
  return parsed !== null && isValid(parsed);
}

/**
 * Get current date formatted for display (DD-MM-YYYY)
 */
export function getCurrentDateDisplay(): string {
  return format(new Date(), DATE_FORMATS.DISPLAY, { locale: enGB });
}

/**
 * Get current date formatted for input (YYYY-MM-DD)
 */
export function getCurrentDateInput(): string {
  return format(new Date(), DATE_FORMATS.INPUT);
}

/**
 * Format datetime for display (DD-MM-YYYY HH:mm)
 */
export function formatDateTimeForDisplay(
  date: string | Date | null | undefined,
  time?: string
): string {
  const parsed = parseDateInput(date);
  if (!parsed) return '';
  
  if (time) {
    const [hours, minutes] = time.split(':').map(Number);
    parsed.setHours(hours, minutes);
  }
  
  return format(parsed, 'dd-MM-yyyy HH:mm', { locale: enGB });
}

/**
 * Format time only (HH:mm)
 */
export function formatTimeForDisplay(time: string | null | undefined): string {
  if (!time) return '';
  // Handle HH:mm:ss format by taking only first two parts
  return time.split(':').slice(0, 2).join(':');
}

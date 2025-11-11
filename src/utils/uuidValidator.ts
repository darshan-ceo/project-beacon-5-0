/**
 * UUID Validation Utilities
 * Centralized validation and sanitization for UUIDs across the application
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Check if a value is a valid UUID v4
 */
export const isValidUUID = (value: any): boolean => {
  if (!value || typeof value !== 'string') return false;
  if (value.trim() === '') return false;
  return UUID_REGEX.test(value);
};

/**
 * Convert value to UUID or return null
 * Use this for optional UUID fields
 */
export const asUUIDOrNull = (value: any): string | null => {
  return isValidUUID(value) ? value : null;
};

/**
 * Require a valid UUID or throw an error
 * Use this for required UUID fields
 */
export const requireUUID = (value: any, fieldName: string): string => {
  if (!isValidUUID(value)) {
    throw new Error(`Invalid UUID for ${fieldName}: ${value}`);
  }
  return value;
};

/**
 * Sanitize UUID fields in an object
 * Converts invalid UUIDs to null and logs warnings
 */
export const sanitizeUUIDs = <T extends Record<string, any>>(
  obj: T,
  uuidFields: (keyof T)[]
): T => {
  const sanitized = { ...obj };
  
  for (const field of uuidFields) {
    const value = sanitized[field];
    if (value !== undefined && value !== null && !isValidUUID(value)) {
      console.warn(`⚠️ Invalid UUID for field "${String(field)}": ${value} - setting to null`);
      sanitized[field] = null as any;
    }
  }
  
  return sanitized;
};

/**
 * Validate all UUID foreign keys in an object
 * Throws error if any required FK is invalid
 */
export const validateForeignKeys = (
  obj: Record<string, any>,
  requiredFKs: string[],
  optionalFKs: string[] = []
): void => {
  // Check required foreign keys
  for (const fkName of requiredFKs) {
    const value = obj[fkName];
    if (!value) {
      throw new Error(`Required foreign key "${fkName}" is missing`);
    }
    if (!isValidUUID(value)) {
      throw new Error(`Invalid UUID for foreign key "${fkName}": ${value}`);
    }
  }
  
  // Check optional foreign keys
  for (const fkName of optionalFKs) {
    const value = obj[fkName];
    if (value && !isValidUUID(value)) {
      throw new Error(`Invalid UUID for optional foreign key "${fkName}": ${value}`);
    }
  }
};

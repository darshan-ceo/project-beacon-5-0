/**
 * Email configuration and validation settings
 */
export const EMAIL_CONFIG = {
  // Email validation regex (RFC 5322 simplified)
  regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  
  // Minimum length for email to trigger duplicate check
  minLengthForCheck: 5,
  
  // Maximum emails per entity
  maxEmails: 5,
  
  // Available email labels
  labels: ['Work', 'Personal', 'Legal', 'Other'] as const,
  
  // Default label for new emails
  defaultLabel: 'Work' as const,
  
  // Validation messages
  validationMessages: {
    invalid: 'Please enter a valid email address',
    incomplete: 'Complete the email address and press Enter to add',
    alreadyInList: 'This email is already in the list',
    maxReached: 'Maximum 5 emails allowed',
    duplicate: (entityName: string, moduleName: string) => 
      `Also used by ${entityName} (${moduleName}) - you can still add it`,
  },
  
  // Help text
  helpText: 'Press Enter to add email. Duplicate emails are allowed but will be flagged for awareness.',
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  return EMAIL_CONFIG.regex.test(email.trim());
};

/**
 * Check if email is already in the provided list
 */
export const isEmailInList = (
  email: string, 
  existingEmails: Array<{ email: string }>
): boolean => {
  const normalized = email.toLowerCase().trim();
  return existingEmails.some(e => e.email.toLowerCase().trim() === normalized);
};

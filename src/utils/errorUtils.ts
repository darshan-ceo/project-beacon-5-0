/**
 * Error Utility Functions
 * Safely extract meaningful error messages from various error types
 */

export function getErrorMessage(err: unknown): string {
  if (!err) return '';
  
  // Handle Error objects
  if (err instanceof Error) {
    return err.message || 'An unexpected error occurred';
  }
  
  // Handle objects with common error properties
  if (typeof err === 'object') {
    const errorObj = err as Record<string, unknown>;
    
    // Check common error message properties
    if (typeof errorObj.message === 'string' && errorObj.message) {
      return errorObj.message;
    }
    if (typeof errorObj.error_description === 'string' && errorObj.error_description) {
      return errorObj.error_description;
    }
    if (typeof errorObj.error === 'string' && errorObj.error) {
      return errorObj.error;
    }
    if (typeof errorObj.details === 'string' && errorObj.details) {
      return errorObj.details;
    }
    if (typeof errorObj.msg === 'string' && errorObj.msg) {
      return errorObj.msg;
    }
    
    // Try JSON stringify but check for empty object
    const stringified = JSON.stringify(errorObj);
    if (stringified && stringified !== '{}' && stringified !== '[]') {
      return stringified;
    }
  }
  
  // Handle string errors
  if (typeof err === 'string' && err) {
    return err;
  }
  
  return 'An unexpected error occurred';
}

/**
 * Get a user-friendly error message for authentication errors
 */
export function getAuthErrorMessage(err: unknown): string {
  const rawMessage = getErrorMessage(err);
  
  // Map common auth errors to user-friendly messages
  const errorMappings: Record<string, string> = {
    'Invalid login credentials': 'Incorrect password. Please try again or contact your administrator to reset your password.',
    'Email not confirmed': 'Account not verified. Please contact your administrator.',
    'User not found': 'Username not found. Please check your username.',
    'invalid_grant': 'Incorrect password. Please try again or contact your administrator.',
    'Invalid Refresh Token': 'Your session has expired. Please log in again.',
    'Network': 'Unable to connect. Please check your internet connection.',
    'fetch': 'Unable to connect. Please check your internet connection.',
    'timeout': 'Connection timed out. Please try again.',
    'not enabled': 'Portal access is not enabled for this account.',
    'portal access': 'Portal access is not configured. Please contact your administrator.',
    'not found': 'Username not found. Please verify your username.',
    'deactivated': 'Your account has been deactivated. Please contact your administrator.',
    'disabled': 'Your account has been disabled. Please contact your administrator.',
  };
  
  // Check if the error matches any known patterns
  for (const [pattern, friendlyMessage] of Object.entries(errorMappings)) {
    if (rawMessage.toLowerCase().includes(pattern.toLowerCase())) {
      return friendlyMessage;
    }
  }
  
  // If message is empty or generic, return friendly fallback
  if (!rawMessage || rawMessage === '{}' || rawMessage === 'An unexpected error occurred') {
    return 'Login failed. Please check your credentials or contact your administrator.';
  }
  
  return rawMessage;
}

/**
 * Portal-specific error codes for tracking login failures
 */
export enum PortalLoginErrorCode {
  LOOKUP_FAILED = 'LOOKUP_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR', 
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ACCOUNT_DISABLED = 'ACCOUNT_DISABLED',
  PORTAL_NOT_FOUND = 'PORTAL_NOT_FOUND',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Parse auth error to determine the failure type
 */
export function parsePortalLoginError(err: unknown): { code: PortalLoginErrorCode; message: string } {
  const rawMessage = getErrorMessage(err);
  const lowerMessage = rawMessage.toLowerCase();
  
  if (lowerMessage.includes('network') || lowerMessage.includes('fetch') || lowerMessage.includes('timeout')) {
    return { code: PortalLoginErrorCode.NETWORK_ERROR, message: 'Unable to connect. Please check your internet connection.' };
  }
  
  if (lowerMessage.includes('invalid login') || lowerMessage.includes('invalid_grant') || lowerMessage.includes('incorrect')) {
    return { code: PortalLoginErrorCode.INVALID_CREDENTIALS, message: 'Incorrect password. Please try again or contact your administrator to reset your password.' };
  }
  
  if (lowerMessage.includes('not found') || lowerMessage.includes('user not')) {
    return { code: PortalLoginErrorCode.LOOKUP_FAILED, message: 'Username not found. Please verify your username.' };
  }
  
  if (lowerMessage.includes('disabled') || lowerMessage.includes('deactivated') || lowerMessage.includes('inactive')) {
    return { code: PortalLoginErrorCode.ACCOUNT_DISABLED, message: 'Your account has been disabled. Please contact your administrator.' };
  }
  
  if (lowerMessage.includes('portal') || lowerMessage.includes('access')) {
    return { code: PortalLoginErrorCode.PORTAL_NOT_FOUND, message: 'Portal access not found. Please contact your administrator.' };
  }
  
  return { code: PortalLoginErrorCode.UNKNOWN, message: getAuthErrorMessage(err) };
}

/**
 * Password error result with actionable guidance
 */
export interface PasswordErrorResult {
  title: string;
  description: string;
  guidance?: string[];
}

/**
 * Get a user-friendly error message for password-related errors
 * Specifically detects leaked password errors from HaveIBeenPwned integration
 */
export function getPasswordErrorMessage(err: unknown): PasswordErrorResult {
  const rawMessage = getErrorMessage(err);
  const lowerMessage = rawMessage.toLowerCase();
  
  // Password reuse/same password detection
  if (lowerMessage.includes('already used') || 
      lowerMessage.includes('same_password') ||
      lowerMessage.includes('previously used') ||
      lowerMessage.includes('password reuse') ||
      lowerMessage.includes('different password')) {
    return {
      title: 'Password Already Used',
      description: 'Password already used. Please create a different password.',
      guidance: [
        'Choose a password you have not used previously',
        'Use a unique combination of characters',
        'Consider using a password manager to track unique passwords'
      ]
    };
  }
  
  // Leaked password detection (HaveIBeenPwned integration)
  if (lowerMessage.includes('weak') && 
      (lowerMessage.includes('known') || lowerMessage.includes('guess') || lowerMessage.includes('easy'))) {
    return {
      title: 'Password Found in Data Breach',
      description: 'This password has appeared in a known data breach and cannot be used for security reasons.',
      guidance: [
        'Choose a unique password not used on other websites',
        'Use at least 12 characters with uppercase, lowercase, numbers, and symbols',
        'Consider using a password manager to generate secure passwords',
        'Avoid common words, names, or patterns like "Password123"'
      ]
    };
  }
  
  // Password too short
  if (lowerMessage.includes('too short') || 
      (lowerMessage.includes('at least') && lowerMessage.includes('character'))) {
    return {
      title: 'Password Too Short',
      description: 'Password must be at least 8 characters long.',
      guidance: ['Use a longer password with a mix of characters']
    };
  }
  
  // Generic weak password (without breach detection)
  if (lowerMessage.includes('weak')) {
    return {
      title: 'Password Too Weak',
      description: 'Please choose a stronger password.',
      guidance: [
        'Include uppercase and lowercase letters',
        'Add numbers and special characters (!@#$%^&*)',
        'Avoid common patterns or dictionary words'
      ]
    };
  }
  
  // Password mismatch
  if (lowerMessage.includes('match') || lowerMessage.includes('mismatch')) {
    return {
      title: 'Passwords Do Not Match',
      description: 'Please ensure both password fields are identical.'
    };
  }
  
  // Common password patterns
  if (lowerMessage.includes('common') || lowerMessage.includes('dictionary')) {
    return {
      title: 'Password Too Common',
      description: 'This password is too common and easy to guess.',
      guidance: [
        'Avoid common words and phrases',
        'Use a unique combination of characters',
        'Consider using a passphrase with random words'
      ]
    };
  }
  
  // Default fallback
  return {
    title: 'Password Error',
    description: rawMessage || 'Failed to update password. Please try again.'
  };
}

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
    'Invalid login credentials': 'Invalid username or password',
    'Email not confirmed': 'Please verify your email before logging in',
    'User not found': 'Invalid username or password',
    'invalid_grant': 'Invalid username or password',
    'Invalid Refresh Token': 'Your session has expired. Please log in again.',
  };
  
  // Check if the error matches any known patterns
  for (const [pattern, friendlyMessage] of Object.entries(errorMappings)) {
    if (rawMessage.toLowerCase().includes(pattern.toLowerCase())) {
      return friendlyMessage;
    }
  }
  
  // If message is empty or generic, return friendly fallback
  if (!rawMessage || rawMessage === '{}' || rawMessage === 'An unexpected error occurred') {
    return 'Invalid username or password. Please try again.';
  }
  
  return rawMessage;
}

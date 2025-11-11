/**
 * Supabase Error Handler
 * Provides user-friendly error messages for Supabase operations
 */

import { toast } from '@/hooks/use-toast';

interface SupabaseError {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

export const ERROR_MESSAGES: Record<string, string> = {
  // PostgreSQL error codes
  '42P01': 'Table not found - this feature may not be fully implemented',
  '23505': 'Record already exists',
  '23503': 'Cannot delete - record is in use by other data',
  '42501': 'Permission denied - insufficient privileges',
  '23502': 'Required field is missing',
  '22P02': 'Invalid data format',
  '23514': 'Data violates validation rules',
  'PGRST116': 'Record not found',
  '42703': 'Unknown field in request',
  '42P02': 'Parameter error',
  
  // Auth errors
  'invalid_grant': 'Invalid credentials',
  'user_not_found': 'User not found',
  'session_not_found': 'Session expired - please login again',
  'refresh_token_not_found': 'Session expired - please login again',
  
  // RLS errors
  'row_level_security': 'Access denied by security policy',
  'policy_violation': 'You do not have permission to perform this action',
};

export const OPERATION_MESSAGES: Record<string, { success: string; error: string }> = {
  create: {
    success: 'Created successfully',
    error: 'Failed to create record',
  },
  update: {
    success: 'Updated successfully',
    error: 'Failed to update record',
  },
  delete: {
    success: 'Deleted successfully',
    error: 'Failed to delete record',
  },
  fetch: {
    success: 'Data loaded',
    error: 'Failed to load data',
  },
};

export function handleSupabaseError(
  error: SupabaseError | Error,
  operation: string,
  entityName?: string
): string {
  console.error(`[Supabase Error] ${operation}:`, error);
  
  const errorCode = (error as SupabaseError).code;
  const errorMessage = error.message || 'Unknown error';
  
  // Check for specific error codes
  let userMessage = ERROR_MESSAGES[errorCode || ''] || errorMessage;
  
  // Check for RLS violations in message
  if (errorMessage.includes('row-level security') || errorMessage.includes('policy')) {
    userMessage = ERROR_MESSAGES['row_level_security'];
  }
  
  // Check for JWT/session errors
  if (errorMessage.includes('JWT') || errorMessage.includes('session')) {
    userMessage = ERROR_MESSAGES['session_not_found'];
  }
  
  // Construct final message
  const entityLabel = entityName ? `${entityName} ` : '';
  const operationLabel = OPERATION_MESSAGES[operation]?.error || `Failed to ${operation}`;
  
  return `${operationLabel}${entityLabel ? ` (${entityLabel})` : ''}: ${userMessage}`;
}

export function showSupabaseError(
  error: SupabaseError | Error,
  operation: string,
  entityName?: string
): void {
  const message = handleSupabaseError(error, operation, entityName);
  
  const devSuffix = (import.meta as any).env?.DEV ? ` [${(error as any).code || 'no-code'}] ${(error as any).message || ''}` : '';
  toast({
    title: OPERATION_MESSAGES[operation]?.error || `Operation Failed`,
    description: `${message}${devSuffix ? ` ${devSuffix}` : ''}`,
    variant: 'destructive',
  });
}

export function showSupabaseSuccess(
  operation: string,
  entityName?: string
): void {
  const message = OPERATION_MESSAGES[operation]?.success || 'Operation successful';
  const entityLabel = entityName ? `${entityName} ` : '';
  
  toast({
    title: message,
    description: entityLabel ? `${entityLabel}${message.toLowerCase()}` : undefined,
  });
}

/**
 * Check if error is due to missing authentication
 */
export function isAuthError(error: SupabaseError | Error): boolean {
  const errorMessage = error.message || '';
  const errorCode = (error as SupabaseError).code || '';
  
  return (
    errorMessage.includes('JWT') ||
    errorMessage.includes('session') ||
    errorMessage.includes('auth') ||
    errorCode === 'session_not_found' ||
    errorCode === 'invalid_grant' ||
    errorCode === 'user_not_found'
  );
}

/**
 * Check if error is due to RLS policy violation
 */
export function isRLSError(error: SupabaseError | Error): boolean {
  const errorMessage = error.message || '';
  
  return (
    errorMessage.includes('row-level security') ||
    errorMessage.includes('policy') ||
    errorMessage.includes('42501')
  );
}

/**
 * Check if error is due to missing data/record
 */
export function isNotFoundError(error: SupabaseError | Error): boolean {
  const errorCode = (error as SupabaseError).code || '';
  return errorCode === 'PGRST116';
}

/**
 * Centralized Toast Message Constants
 * Provides consistent messaging across the entire application
 */

export const TOAST_MESSAGES = {
  // Success messages by entity
  SUCCESS: {
    CASE: {
      CREATED: { title: 'Case Created', description: 'Case has been created successfully' },
      UPDATED: { title: 'Case Updated', description: 'Case has been updated successfully' },
      DELETED: { title: 'Case Deleted', description: 'Case has been removed' },
      ASSIGNED: { title: 'Case Assigned', description: 'Case has been assigned successfully' },
    },
    CLIENT: {
      CREATED: { title: 'Client Created', description: 'Client has been added successfully' },
      UPDATED: { title: 'Client Updated', description: 'Client details have been updated' },
      DELETED: { title: 'Client Deleted', description: 'Client has been removed' },
    },
    TASK: {
      CREATED: { title: 'Task Created', description: 'Task has been created successfully' },
      UPDATED: { title: 'Task Updated', description: 'Task has been updated successfully' },
      DELETED: { title: 'Task Deleted', description: 'Task has been removed' },
      COMPLETED: { title: 'Task Completed', description: 'Task marked as completed' },
    },
    HEARING: {
      CREATED: { title: 'Hearing Scheduled', description: 'Hearing has been scheduled successfully' },
      UPDATED: { title: 'Hearing Updated', description: 'Hearing details have been updated' },
      DELETED: { title: 'Hearing Deleted', description: 'Hearing has been removed' },
      RESCHEDULED: { title: 'Hearing Rescheduled', description: 'Hearing date has been changed' },
    },
    DOCUMENT: {
      UPLOADED: { title: 'Document Uploaded', description: 'Document has been uploaded successfully' },
      UPDATED: { title: 'Document Updated', description: 'Document has been updated' },
      DELETED: { title: 'Document Deleted', description: 'Document has been removed' },
      DOWNLOADED: { title: 'Download Started', description: 'Your file is downloading' },
    },
    EMPLOYEE: {
      CREATED: { title: 'Employee Added', description: 'Employee has been created successfully' },
      UPDATED: { title: 'Employee Updated', description: 'Employee details have been updated' },
      DELETED: { title: 'Employee Removed', description: 'Employee has been removed' },
      INVITED: { title: 'Invitation Sent', description: 'Employee invitation email sent' },
    },
    COURT: {
      CREATED: { title: 'Court Added', description: 'Court has been added successfully' },
      UPDATED: { title: 'Court Updated', description: 'Court details have been updated' },
      DELETED: { title: 'Court Deleted', description: 'Court has been removed' },
    },
    JUDGE: {
      CREATED: { title: 'Judge Added', description: 'Judge has been added successfully' },
      UPDATED: { title: 'Judge Updated', description: 'Judge details have been updated' },
      DELETED: { title: 'Judge Deleted', description: 'Judge has been removed' },
    },
    COMMUNICATION: {
      SENT: { title: 'Message Sent', description: 'Your message has been sent successfully' },
      EMAIL_SENT: { title: 'Email Sent', description: 'Email has been delivered' },
      SMS_SENT: { title: 'SMS Sent', description: 'SMS has been sent' },
    },
    IMPORT: {
      COMPLETED: { title: 'Import Successful', description: 'Data has been imported successfully' },
      PARTIAL: { title: 'Partial Import', description: 'Some records were imported with warnings' },
    },
    EXPORT: {
      COMPLETED: { title: 'Export Complete', description: 'File is ready for download' },
    },
  },

  // Error messages
  ERROR: {
    VALIDATION: { 
      title: 'Validation Failed', 
      description: 'Please fix the errors below and try again' 
    },
    REQUIRED_FIELDS: {
      title: 'Required Fields Missing',
      description: 'Please fill in all required fields'
    },
    PERMISSION: { 
      title: 'Permission Denied', 
      description: "You don't have permission to perform this action" 
    },
    NETWORK: { 
      title: 'Network Error', 
      description: 'Unable to connect to server. Please check your connection.' 
    },
    GENERIC: { 
      title: 'Error', 
      description: 'Something went wrong. Please try again.' 
    },
    NOT_FOUND: {
      title: 'Not Found',
      description: 'The requested resource could not be found'
    },
    DUPLICATE: {
      title: 'Duplicate Entry',
      description: 'A record with this information already exists'
    },
    INVALID_FILE: {
      title: 'Invalid File',
      description: 'Please select a valid file'
    },
    FILE_TOO_LARGE: {
      title: 'File Too Large',
      description: 'File size exceeds the maximum allowed limit'
    },
    AUTHENTICATION: {
      title: 'Authentication Failed',
      description: 'Please log in again to continue'
    },
    SESSION_EXPIRED: {
      title: 'Session Expired',
      description: 'Your session has expired. Please log in again.'
    },
  },

  // Warning messages
  WARNING: {
    UNSAVED_CHANGES: {
      title: 'Unsaved Changes',
      description: 'You have unsaved changes. Are you sure you want to leave?'
    },
    CONFLICT: {
      title: 'Scheduling Conflict',
      description: 'This hearing conflicts with another hearing'
    },
    MISSING_INFO: {
      title: 'Information Missing',
      description: 'Some optional information is missing'
    },
  },

  // Info messages
  INFO: {
    LOADING: { 
      title: 'Loading...', 
      description: 'Please wait while we fetch your data' 
    },
    SAVING: { 
      title: 'Saving...', 
      description: 'Please wait while we save your changes' 
    },
    PROCESSING: {
      title: 'Processing...',
      description: 'Your request is being processed'
    },
    NO_CHANGES: {
      title: 'No Changes',
      description: 'No changes were made'
    },
  },
} as const;

/**
 * Helper function to get entity-specific success messages
 */
export function getSuccessMessage(entity: string, operation: string): { title: string; description: string } {
  const entityKey = entity.toUpperCase() as keyof typeof TOAST_MESSAGES.SUCCESS;
  const operationKey = operation.toUpperCase() as keyof typeof TOAST_MESSAGES.SUCCESS[typeof entityKey];
  
  if (TOAST_MESSAGES.SUCCESS[entityKey]?.[operationKey]) {
    return TOAST_MESSAGES.SUCCESS[entityKey][operationKey];
  }
  
  return { title: `${entity} ${operation}`, description: `${entity} has been ${operation.toLowerCase()} successfully` };
}

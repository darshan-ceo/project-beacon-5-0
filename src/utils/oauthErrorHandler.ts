/**
 * OAuth Error Handler Utility
 * Maps OAuth error codes to user-friendly messages with actionable guidance
 */

export interface OAuthErrorInfo {
  code: string;
  title: string;
  message: string;
  action: string;
  severity: 'critical' | 'warning' | 'info';
  helpUrl?: string;
}

// Google OAuth error mappings
const GOOGLE_OAUTH_ERRORS: Record<string, Omit<OAuthErrorInfo, 'code'>> = {
  deleted_client: {
    title: 'OAuth Client Deleted',
    message: 'The OAuth Client ID has been deleted from Google Cloud Console.',
    action: 'Create a new OAuth Client ID in Google Cloud Console and update your credentials in Settings.',
    severity: 'critical',
    helpUrl: 'https://console.cloud.google.com/apis/credentials'
  },
  invalid_client: {
    title: 'Invalid Client Credentials',
    message: 'The Client ID or Client Secret is incorrect or malformed.',
    action: 'Verify your Client ID and Client Secret match the values in Google Cloud Console.',
    severity: 'critical',
    helpUrl: 'https://console.cloud.google.com/apis/credentials'
  },
  invalid_grant: {
    title: 'Authorization Expired',
    message: 'The authorization code has expired or was already used.',
    action: 'Please try connecting again. Authorization codes are single-use and expire quickly.',
    severity: 'warning'
  },
  access_denied: {
    title: 'Access Denied',
    message: 'You denied calendar access or the OAuth consent was not granted.',
    action: 'Please allow calendar access when prompted during the connection process.',
    severity: 'warning'
  },
  redirect_uri_mismatch: {
    title: 'Redirect URI Mismatch',
    message: 'The redirect URI in your app doesn\'t match the one configured in Google Cloud Console.',
    action: 'Add the correct redirect URI to your Google Cloud Console OAuth client.',
    severity: 'critical',
    helpUrl: 'https://console.cloud.google.com/apis/credentials'
  },
  unauthorized_client: {
    title: 'Unauthorized Client',
    message: 'This OAuth client is not authorized for the requested scope or operation.',
    action: 'Ensure the OAuth consent screen is configured and the Calendar API is enabled.',
    severity: 'critical',
    helpUrl: 'https://console.cloud.google.com/apis/library/calendar-json.googleapis.com'
  },
  unsupported_grant_type: {
    title: 'Unsupported Grant Type',
    message: 'The authorization server doesn\'t support this grant type.',
    action: 'This is a configuration issue. Please contact support.',
    severity: 'critical'
  },
  invalid_scope: {
    title: 'Invalid Scope',
    message: 'The requested OAuth scope is invalid or not supported.',
    action: 'The Calendar API scope may need to be enabled in your Google Cloud project.',
    severity: 'critical',
    helpUrl: 'https://console.cloud.google.com/apis/library/calendar-json.googleapis.com'
  },
  org_internal: {
    title: 'Organization Internal',
    message: 'This OAuth client is restricted to internal organization users only.',
    action: 'If you\'re testing, add your email as a test user in the OAuth consent screen, or publish the app.',
    severity: 'warning',
    helpUrl: 'https://console.cloud.google.com/apis/credentials/consent'
  }
};

// Microsoft OAuth error mappings
const MICROSOFT_OAUTH_ERRORS: Record<string, Omit<OAuthErrorInfo, 'code'>> = {
  invalid_client: {
    title: 'Invalid Application',
    message: 'The Application ID or Client Secret is incorrect.',
    action: 'Verify your Application (Client) ID and Client Secret in Azure Portal.',
    severity: 'critical',
    helpUrl: 'https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade'
  },
  invalid_grant: {
    title: 'Authorization Expired',
    message: 'The authorization code has expired or was already used.',
    action: 'Please try connecting again.',
    severity: 'warning'
  },
  access_denied: {
    title: 'Access Denied',
    message: 'You denied calendar access or admin consent is required.',
    action: 'Please allow calendar access when prompted, or contact your IT administrator.',
    severity: 'warning'
  },
  unauthorized_client: {
    title: 'Unauthorized Application',
    message: 'This application is not authorized for the requested operation.',
    action: 'Ensure the application has the correct API permissions in Azure Portal.',
    severity: 'critical',
    helpUrl: 'https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade'
  },
  consent_required: {
    title: 'Consent Required',
    message: 'Admin consent is required for this application.',
    action: 'Contact your IT administrator to grant admin consent for this application.',
    severity: 'warning'
  },
  interaction_required: {
    title: 'Interaction Required',
    message: 'Additional user interaction is required to complete authentication.',
    action: 'Please try connecting again and complete all authentication prompts.',
    severity: 'warning'
  },
  invalid_resource: {
    title: 'Invalid Resource',
    message: 'The requested resource is invalid or not configured.',
    action: 'Ensure Microsoft Graph API permissions are configured in Azure Portal.',
    severity: 'critical',
    helpUrl: 'https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade'
  }
};

// API error mappings (for runtime errors)
const API_ERROR_MAPPINGS: Record<number, Omit<OAuthErrorInfo, 'code'>> = {
  401: {
    title: 'Authentication Failed',
    message: 'Your access token is invalid or has expired.',
    action: 'Please reconnect your calendar account.',
    severity: 'critical'
  },
  403: {
    title: 'Permission Denied',
    message: 'You don\'t have permission to access this calendar resource.',
    action: 'Check that you have the necessary permissions for this calendar.',
    severity: 'critical'
  },
  404: {
    title: 'Not Found',
    message: 'The requested calendar or event was not found.',
    action: 'The resource may have been deleted. Try refreshing.',
    severity: 'warning'
  },
  429: {
    title: 'Rate Limited',
    message: 'Too many requests. You\'ve hit the API rate limit.',
    action: 'Please wait a few minutes before trying again.',
    severity: 'warning'
  },
  500: {
    title: 'Server Error',
    message: 'The calendar service is experiencing issues.',
    action: 'Please try again later.',
    severity: 'warning'
  },
  503: {
    title: 'Service Unavailable',
    message: 'The calendar service is temporarily unavailable.',
    action: 'Please try again in a few minutes.',
    severity: 'warning'
  }
};

/**
 * Parse OAuth error from various error formats
 */
export function parseOAuthError(error: unknown, provider: 'google' | 'microsoft'): OAuthErrorInfo {
  // Handle string errors
  if (typeof error === 'string') {
    return getOAuthErrorInfo(error, provider);
  }

  // Handle Error objects
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // Try to extract error code from message
    const codeMatch = message.match(/error[:\s]*(\w+)/i) || 
                      message.match(/(\d{3})[:\s]/);
    
    if (codeMatch) {
      const code = codeMatch[1];
      // Check if it's a status code
      if (/^\d{3}$/.test(code)) {
        return getApiErrorInfo(parseInt(code), error.message);
      }
      return getOAuthErrorInfo(code, provider, error.message);
    }

    // Check for specific error patterns
    if (message.includes('deleted_client')) {
      return getOAuthErrorInfo('deleted_client', provider);
    }
    if (message.includes('invalid_client')) {
      return getOAuthErrorInfo('invalid_client', provider);
    }
    if (message.includes('redirect_uri')) {
      return getOAuthErrorInfo('redirect_uri_mismatch', provider);
    }

    return {
      code: 'unknown',
      title: 'Connection Error',
      message: error.message,
      action: 'Please check your configuration and try again.',
      severity: 'warning'
    };
  }

  // Handle object with error properties
  if (typeof error === 'object' && error !== null) {
    const errorObj = error as Record<string, any>;
    const code = errorObj.error || errorObj.code || errorObj.error_code || 'unknown';
    const description = errorObj.error_description || errorObj.message || '';
    
    return getOAuthErrorInfo(code, provider, description);
  }

  return {
    code: 'unknown',
    title: 'Unknown Error',
    message: 'An unexpected error occurred during authentication.',
    action: 'Please try again or contact support.',
    severity: 'warning'
  };
}

/**
 * Get error info for OAuth error codes
 */
export function getOAuthErrorInfo(
  code: string, 
  provider: 'google' | 'microsoft',
  fallbackMessage?: string
): OAuthErrorInfo {
  const errorMap = provider === 'google' ? GOOGLE_OAUTH_ERRORS : MICROSOFT_OAUTH_ERRORS;
  const normalizedCode = code.toLowerCase();
  
  if (errorMap[normalizedCode]) {
    return {
      code: normalizedCode,
      ...errorMap[normalizedCode]
    };
  }

  return {
    code: normalizedCode,
    title: 'Authentication Error',
    message: fallbackMessage || `Error: ${code}`,
    action: 'Please check your configuration and try again.',
    severity: 'warning'
  };
}

/**
 * Get error info for API status codes
 */
export function getApiErrorInfo(statusCode: number, fallbackMessage?: string): OAuthErrorInfo {
  if (API_ERROR_MAPPINGS[statusCode]) {
    return {
      code: statusCode.toString(),
      ...API_ERROR_MAPPINGS[statusCode]
    };
  }

  return {
    code: statusCode.toString(),
    title: `HTTP Error ${statusCode}`,
    message: fallbackMessage || `Request failed with status ${statusCode}`,
    action: 'Please try again or contact support.',
    severity: statusCode >= 500 ? 'warning' : 'critical'
  };
}

/**
 * Get redirect URI for the current environment
 */
export function getRequiredRedirectUri(): string {
  return `${window.location.origin}/oauth/callback`;
}

/**
 * Get JavaScript origin for OAuth configuration
 */
export function getRequiredJsOrigin(): string {
  return window.location.origin;
}

/**
 * Configuration checklist item
 */
export interface ConfigCheckItem {
  label: string;
  value: string;
  copyable?: boolean;
}

/**
 * Get configuration checklist for provider
 */
export function getConfigChecklist(provider: 'google' | 'microsoft'): ConfigCheckItem[] {
  const redirectUri = getRequiredRedirectUri();
  const jsOrigin = getRequiredJsOrigin();

  if (provider === 'google') {
    return [
      { label: 'Redirect URI', value: redirectUri, copyable: true },
      { label: 'JavaScript Origin', value: jsOrigin, copyable: true },
      { label: 'API Enabled', value: 'Google Calendar API must be enabled', copyable: false },
      { label: 'Consent Screen', value: 'OAuth consent screen must be configured', copyable: false }
    ];
  }

  return [
    { label: 'Redirect URI', value: redirectUri, copyable: true },
    { label: 'Platform', value: 'Web (Single-page application)', copyable: false },
    { label: 'API Permissions', value: 'Calendars.ReadWrite, User.Read', copyable: false },
    { label: 'Admin Consent', value: 'May be required for organization accounts', copyable: false }
  ];
}

import { STORAGE_KEYS } from '@/constants/StorageKeys';
import type { EmailSettings, ProviderSmtpConfig, ClientSmtpConfig } from '@/types/email';
import { PROVIDER_CONFIGS } from '@/types/email';
import { 
  emailSettingsSchema, 
  providerSmtpConfigSchema, 
  clientSmtpConfigSchema 
} from '@/utils/emailValidation';
import { encryptCredentials, decryptCredentials, isEncryptionAvailable } from '@/utils/emailEncryption';

/**
 * Email Settings Service
 * Manages email configuration storage and retrieval with encryption
 */

const DEFAULT_SETTINGS: EmailSettings = {
  enabled: false,
  mode: 'provider',
  providerConfig: undefined,
  clientConfig: undefined
};

/**
 * Get email settings from localStorage
 */
export async function getEmailSettings(): Promise<EmailSettings> {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.EMAIL_SETTINGS);
    if (!stored) {
      console.log('[Email Settings] No settings found, using defaults');
      return DEFAULT_SETTINGS;
    }

    const settings = JSON.parse(stored) as EmailSettings;
    
    // Decrypt credentials if available
    if (settings.providerConfig?.appPassword) {
      try {
        settings.providerConfig.appPassword = await decryptCredentials(
          settings.providerConfig.appPassword
        );
      } catch (error) {
        console.warn('[Email Settings] Failed to decrypt provider password');
      }
    }
    
    if (settings.clientConfig?.password) {
      try {
        settings.clientConfig.password = await decryptCredentials(
          settings.clientConfig.password
        );
      } catch (error) {
        console.warn('[Email Settings] Failed to decrypt client password');
      }
    }

    console.log('[Email Settings] Loaded settings:', { 
      enabled: settings.enabled, 
      mode: settings.mode,
      hasProviderConfig: !!settings.providerConfig,
      hasClientConfig: !!settings.clientConfig
    });
    
    return settings;
  } catch (error) {
    console.error('[Email Settings] Failed to load settings:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save email settings to localStorage
 */
export async function saveEmailSettings(settings: EmailSettings): Promise<void> {
  try {
    // Validate settings before saving
    const validation = emailSettingsSchema.safeParse(settings);
    if (!validation.success) {
      throw new Error(`Invalid email settings: ${validation.error.message}`);
    }

    // Clone settings for encryption
    const toSave = JSON.parse(JSON.stringify(settings)) as EmailSettings;

    // Encrypt sensitive credentials
    if (toSave.providerConfig?.appPassword && isEncryptionAvailable()) {
      toSave.providerConfig.appPassword = await encryptCredentials(
        toSave.providerConfig.appPassword
      );
    }
    
    if (toSave.clientConfig?.password && isEncryptionAvailable()) {
      toSave.clientConfig.password = await encryptCredentials(
        toSave.clientConfig.password
      );
    }

    localStorage.setItem(STORAGE_KEYS.EMAIL_SETTINGS, JSON.stringify(toSave));
    
    console.log('[Email Settings] Settings saved successfully:', {
      enabled: settings.enabled,
      mode: settings.mode
    });
  } catch (error) {
    console.error('[Email Settings] Failed to save settings:', error);
    throw error;
  }
}

/**
 * Validate provider SMTP configuration
 */
export function validateProviderConfig(config: ProviderSmtpConfig): { valid: boolean; errors: string[] } {
  const result = providerSmtpConfigSchema.safeParse(config);
  if (result.success) {
    return { valid: true, errors: [] };
  }
  
  const errors = result.error.errors.map(err => err.message);
  return { valid: false, errors };
}

/**
 * Validate client SMTP configuration
 */
export function validateClientSmtpConfig(config: ClientSmtpConfig): { valid: boolean; errors: string[] } {
  const result = clientSmtpConfigSchema.safeParse(config);
  if (result.success) {
    return { valid: true, errors: [] };
  }
  
  const errors = result.error.errors.map(err => err.message);
  return { valid: false, errors };
}

/**
 * Get default configuration for a provider
 */
export function getProviderDefaults(provider: 'gmail' | 'yahoo' | 'outlook') {
  return PROVIDER_CONFIGS[provider];
}

/**
 * Check if email is configured and enabled
 */
export async function isEmailConfigured(): Promise<boolean> {
  const settings = await getEmailSettings();
  
  if (!settings.enabled) return false;
  
  if (settings.mode === 'provider') {
    return !!settings.providerConfig?.email && !!settings.providerConfig?.appPassword;
  }
  
  if (settings.mode === 'client') {
    return !!(
      settings.clientConfig?.host &&
      settings.clientConfig?.port &&
      settings.clientConfig?.username &&
      settings.clientConfig?.password &&
      settings.clientConfig?.fromAddress
    );
  }
  
  return false;
}

/**
 * Clear all email settings
 */
export function clearEmailSettings(): void {
  localStorage.removeItem(STORAGE_KEYS.EMAIL_SETTINGS);
  console.log('[Email Settings] Settings cleared');
}

/**
 * Export settings for backup (without sensitive data)
 */
export async function exportSettings(): Promise<Partial<EmailSettings>> {
  const settings = await getEmailSettings();
  
  return {
    enabled: settings.enabled,
    mode: settings.mode,
    providerConfig: settings.providerConfig ? {
      provider: settings.providerConfig.provider,
      email: settings.providerConfig.email,
      appPassword: '***' // Redacted
    } : undefined,
    clientConfig: settings.clientConfig ? {
      host: settings.clientConfig.host,
      port: settings.clientConfig.port,
      secure: settings.clientConfig.secure,
      username: settings.clientConfig.username,
      password: '***', // Redacted
      fromAddress: settings.clientConfig.fromAddress,
      fromName: settings.clientConfig.fromName
    } : undefined
  };
}

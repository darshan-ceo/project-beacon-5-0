import { supabase } from '@/integrations/supabase/client';
import type { EmailSettings, ProviderSmtpConfig, ClientSmtpConfig } from '@/types/email';
import { PROVIDER_CONFIGS } from '@/types/email';
import { 
  emailSettingsSchema, 
  providerSmtpConfigSchema, 
  clientSmtpConfigSchema 
} from '@/utils/emailValidation';

/**
 * Email Settings Service - Phase 2 Migration
 * Now uses Supabase for persistence via manage-secrets edge function
 * Sensitive credentials handled server-side only
 */

const DEFAULT_SETTINGS: EmailSettings = {
  enabled: false,
  mode: 'provider',
  providerConfig: undefined,
  clientConfig: undefined
};

/**
 * Get email settings from Supabase
 */
export async function getEmailSettings(): Promise<EmailSettings> {
  try {
    const { data, error } = await supabase.functions.invoke('manage-secrets/get-email-config');
    
    if (error) {
      console.error('[Email Settings] Failed to load from Supabase:', error);
      return DEFAULT_SETTINGS;
    }

    if (!data?.config) {
      console.log('[Email Settings] No settings found, using defaults');
      return DEFAULT_SETTINGS;
    }

    const config = data.config;
    
    // Reconstruct settings object (passwords are not returned)
    const settings: EmailSettings = {
      enabled: config.enabled ?? false,
      mode: config.mode ?? 'provider',
      providerConfig: config.providerConfig ? {
        provider: config.providerConfig.provider,
        email: config.providerConfig.email,
        appPassword: config.hasPassword ? '••••••••' : '' // Placeholder - actual password is server-side
      } : undefined,
      clientConfig: config.clientConfig ? {
        host: config.clientConfig.host,
        port: config.clientConfig.port,
        secure: config.clientConfig.secure,
        username: config.clientConfig.username,
        password: config.hasPassword ? '••••••••' : '', // Placeholder
        fromAddress: config.clientConfig.fromAddress,
        fromName: config.clientConfig.fromName
      } : undefined
    };

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
 * Save email settings to Supabase (sensitive data handled by edge function)
 */
export async function saveEmailSettings(settings: EmailSettings): Promise<void> {
  try {
    // Validate settings before saving
    const validation = emailSettingsSchema.safeParse(settings);
    if (!validation.success) {
      throw new Error(`Invalid email settings: ${validation.error.message}`);
    }

    // Prepare config for edge function
    const config: any = {
      enabled: settings.enabled,
      mode: settings.mode,
    };

    if (settings.mode === 'provider' && settings.providerConfig) {
      config.providerConfig = {
        provider: settings.providerConfig.provider,
        email: settings.providerConfig.email,
      };
      // Only send password if it's not the placeholder
      if (settings.providerConfig.appPassword && !settings.providerConfig.appPassword.includes('•')) {
        config.appPassword = settings.providerConfig.appPassword;
      }
    }

    if (settings.mode === 'client' && settings.clientConfig) {
      config.clientConfig = {
        host: settings.clientConfig.host,
        port: settings.clientConfig.port,
        secure: settings.clientConfig.secure,
        username: settings.clientConfig.username,
        fromAddress: settings.clientConfig.fromAddress,
        fromName: settings.clientConfig.fromName,
      };
      // Only send password if it's not the placeholder
      if (settings.clientConfig.password && !settings.clientConfig.password.includes('•')) {
        config.password = settings.clientConfig.password;
      }
    }

    const { error } = await supabase.functions.invoke('manage-secrets/save-email-config', {
      body: { config }
    });

    if (error) {
      console.error('[Email Settings] Failed to save:', error);
      throw new Error('Failed to save email settings');
    }
    
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
    return !!settings.providerConfig?.email;
  }
  
  if (settings.mode === 'client') {
    return !!(
      settings.clientConfig?.host &&
      settings.clientConfig?.port &&
      settings.clientConfig?.username &&
      settings.clientConfig?.fromAddress
    );
  }
  
  return false;
}

/**
 * Clear all email settings
 */
export async function clearEmailSettings(): Promise<void> {
  try {
    await supabase.functions.invoke('manage-secrets/save-email-config', {
      body: { config: { enabled: false, mode: 'provider' } }
    });
    console.log('[Email Settings] Settings cleared');
  } catch (error) {
    console.error('[Email Settings] Failed to clear settings:', error);
  }
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

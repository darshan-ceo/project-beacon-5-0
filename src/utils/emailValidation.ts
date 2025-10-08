import { z } from 'zod';

/**
 * Email Validation Utilities
 * RFC 5322 compliant validation and configuration schemas
 */

// Basic email validation (RFC 5322 simplified)
export const emailSchema = z.string()
  .trim()
  .email({ message: 'Invalid email address' })
  .max(255, { message: 'Email must be less than 255 characters' });

// Hostname validation
export const hostnameSchema = z.string()
  .trim()
  .min(1, { message: 'Host is required' })
  .regex(/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/, {
    message: 'Invalid hostname format'
  })
  .max(253, { message: 'Hostname too long' });

// Port validation
export const portSchema = z.number()
  .int({ message: 'Port must be an integer' })
  .min(1, { message: 'Port must be at least 1' })
  .max(65535, { message: 'Port must be at most 65535' });

// Provider SMTP configuration schema
export const providerSmtpConfigSchema = z.object({
  provider: z.enum(['gmail', 'yahoo', 'outlook'], {
    errorMap: () => ({ message: 'Please select a provider' })
  }),
  email: emailSchema,
  appPassword: z.string()
    .trim()
    .min(1, { message: 'App password is required' })
    .min(8, { message: 'App password must be at least 8 characters' })
});

// Client SMTP configuration schema
export const clientSmtpConfigSchema = z.object({
  host: hostnameSchema,
  port: portSchema,
  secure: z.boolean(),
  username: z.string()
    .trim()
    .min(1, { message: 'Username is required' })
    .max(255, { message: 'Username too long' }),
  password: z.string()
    .trim()
    .min(1, { message: 'Password is required' }),
  fromAddress: emailSchema,
  fromName: z.string()
    .trim()
    .max(100, { message: 'From name too long' })
    .optional()
});

// Complete email settings schema
export const emailSettingsSchema = z.object({
  enabled: z.boolean(),
  mode: z.enum(['provider', 'client'], {
    errorMap: () => ({ message: 'Please select a mode' })
  }),
  providerConfig: providerSmtpConfigSchema.optional(),
  clientConfig: clientSmtpConfigSchema.optional()
}).refine(
  (data) => {
    if (!data.enabled) return true;
    if (data.mode === 'provider') return !!data.providerConfig;
    if (data.mode === 'client') return !!data.clientConfig;
    return false;
  },
  {
    message: 'Configuration is required when email is enabled',
    path: ['mode']
  }
);

// Email message validation
export const emailMessageSchema = z.object({
  to: z.union([emailSchema, z.array(emailSchema)]),
  subject: z.string()
    .trim()
    .min(1, { message: 'Subject is required' })
    .max(998, { message: 'Subject too long' }),
  body: z.string()
    .trim()
    .min(1, { message: 'Message body is required' }),
  html: z.string().optional(),
  replyTo: emailSchema.optional(),
  cc: z.array(emailSchema).optional(),
  bcc: z.array(emailSchema).optional()
});

/**
 * Validate email address (simple check)
 */
export function validateEmail(email: string): boolean {
  try {
    emailSchema.parse(email);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate SMTP port number
 */
export function validatePort(port: number): boolean {
  try {
    portSchema.parse(port);
    return true;
  } catch {
    return false;
  }
}

/**
 * Common SMTP ports with descriptions
 */
export const COMMON_PORTS = [
  { value: 25, label: '25 (Standard SMTP - may be blocked)', secure: false },
  { value: 587, label: '587 (STARTTLS - recommended)', secure: true },
  { value: 465, label: '465 (SSL/TLS)', secure: true },
  { value: 2525, label: '2525 (Alternative)', secure: false }
];

/**
 * Get port recommendation based on security preference
 */
export function getRecommendedPort(secure: boolean): number {
  return secure ? 587 : 25;
}

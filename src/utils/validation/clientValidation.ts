import { z } from 'zod';

/**
 * Client validation schema
 * Validates client data for creation and updates
 */
export const clientSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(1, 'Client name is required')
    .max(200, 'Client name must be less than 200 characters'),
  
  email: z
    .string()
    .trim()
    .max(255, 'Email must be less than 255 characters')
    .email('Invalid email address')
    .optional()
    .or(z.literal('')),
  
  phone: z
    .string()
    .trim()
    .max(20, 'Phone number must be less than 20 characters')
    .regex(/^[0-9+\-\s()]*$/, 'Invalid phone number format')
    .optional()
    .or(z.literal('')),
  
  gstin: z
    .string()
    .trim()
    .max(15, 'GSTIN must be 15 characters')
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format')
    .optional()
    .or(z.literal('')),
  
  pan: z
    .string()
    .trim()
    .length(10, 'PAN must be exactly 10 characters')
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Invalid PAN format (e.g., ABCDE1234F)')
    .optional()
    .or(z.literal('')),
  
  address: z
    .string()
    .trim()
    .max(500, 'Address must be less than 500 characters')
    .optional()
    .or(z.literal('')),
  
  city: z
    .string()
    .trim()
    .max(100, 'City must be less than 100 characters')
    .optional()
    .or(z.literal('')),
  
  state: z
    .string()
    .trim()
    .max(100, 'State must be less than 100 characters')
    .optional()
    .or(z.literal('')),
  
  pincode: z
    .string()
    .trim()
    .regex(/^[0-9]{6}$/, 'Pincode must be 6 digits')
    .optional()
    .or(z.literal('')),
});

export type ClientFormData = z.infer<typeof clientSchema>;

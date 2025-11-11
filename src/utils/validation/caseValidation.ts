import { z } from 'zod';

/**
 * Case validation schema
 * Validates case data for creation and updates
 */
export const caseSchema = z.object({
  case_number: z
    .string()
    .trim()
    .min(1, 'Case number is required')
    .max(50, 'Case number must be less than 50 characters'),
  
  title: z
    .string()
    .trim()
    .min(1, 'Case title is required')
    .max(500, 'Case title must be less than 500 characters'),
  
  description: z
    .string()
    .trim()
    .max(5000, 'Description must be less than 5000 characters')
    .optional()
    .or(z.literal('')),
  
  filing_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Filing date must be in YYYY-MM-DD format'),
  
  case_type: z.enum(['GST', 'Income_Tax', 'Custom_Duty', 'Other'], {
    errorMap: () => ({ message: 'Invalid case type' }),
  }),
  
  status: z
    .enum(['Open', 'In_Progress', 'On_Hold', 'Closed', 'Won', 'Lost'], {
      errorMap: () => ({ message: 'Invalid case status' }),
    })
    .optional(),
  
  stage: z
    .string()
    .trim()
    .max(100, 'Stage must be less than 100 characters')
    .optional()
    .or(z.literal('')),
  
  priority: z
    .enum(['High', 'Medium', 'Low'], {
      errorMap: () => ({ message: 'Invalid priority' }),
    })
    .optional(),
  
  court_name: z
    .string()
    .trim()
    .max(200, 'Court name must be less than 200 characters')
    .optional()
    .or(z.literal('')),
  
  opposing_party: z
    .string()
    .trim()
    .max(200, 'Opposing party must be less than 200 characters')
    .optional()
    .or(z.literal('')),
  
  client_id: z
    .string()
    .uuid('Invalid client ID - please select a valid client'),
  
  assigned_to: z
    .string()
    .uuid('Invalid assigned user ID')
    .optional()
    .or(z.literal('')),
  
  owner_id: z
    .string()
    .uuid('Invalid owner ID')
    .optional()
    .or(z.literal('')),
  
  authority_id: z
    .string()
    .uuid('Invalid authority ID')
    .optional()
    .or(z.literal('')),
  
  forum_id: z
    .string()
    .uuid('Invalid forum ID')
    .optional()
    .or(z.literal('')),
});

export type CaseFormData = z.infer<typeof caseSchema>;

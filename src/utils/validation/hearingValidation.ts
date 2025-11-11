import { z } from 'zod';

/**
 * Hearing validation schema
 * Validates hearing data for creation and updates
 */
export const hearingSchema = z.object({
  case_id: z
    .string()
    .uuid('Invalid case ID - please select a valid case'),
  
  court_id: z
    .string()
    .uuid('Invalid court ID')
    .optional(),
  
  authority_id: z
    .string()
    .uuid('Invalid authority ID')
    .optional(),
  
  forum_id: z
    .string()
    .uuid('Invalid forum ID')
    .optional(),
  
  judge_id: z
    .string()
    .uuid('Invalid judge ID')
    .optional(),
  
  hearing_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Hearing date must be in YYYY-MM-DD format'),
  
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in 24-hour format (HH:mm)'),
  
  notes: z
    .string()
    .max(2000, 'Notes must be less than 2000 characters')
    .optional()
    .or(z.literal('')),
  
  agenda: z
    .string()
    .max(1000, 'Agenda must be less than 1000 characters')
    .optional()
    .or(z.literal('')),
  
  status: z
    .enum(['scheduled', 'concluded', 'adjourned', 'no-board', 'withdrawn'], {
      errorMap: () => ({ message: 'Invalid hearing status' }),
    })
    .optional(),
  
  outcome: z
    .string()
    .max(500, 'Outcome must be less than 500 characters')
    .optional()
    .or(z.literal('')),
});

export type HearingFormData = z.infer<typeof hearingSchema>;

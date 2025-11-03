import { z } from 'zod';

/**
 * Task validation schema
 * Validates task data for creation and updates
 */
export const taskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Task title is required')
    .max(200, 'Task title must be less than 200 characters'),
  
  description: z
    .string()
    .trim()
    .max(2000, 'Description must be less than 2000 characters')
    .optional()
    .or(z.literal('')),
  
  priority: z.enum(['High', 'Medium', 'Low'], {
    errorMap: () => ({ message: 'Invalid priority level' }),
  }),
  
  status: z
    .enum(['Pending', 'In_Progress', 'Completed', 'Cancelled'], {
      errorMap: () => ({ message: 'Invalid status' }),
    })
    .optional(),
  
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be in YYYY-MM-DD format'),
  
  assigned_to: z
    .string()
    .uuid('Invalid user ID')
    .optional(),
  
  estimated_hours: z
    .number()
    .min(0, 'Estimated hours must be positive')
    .max(1000, 'Estimated hours must be less than 1000')
    .optional(),
});

export type TaskFormData = z.infer<typeof taskSchema>;

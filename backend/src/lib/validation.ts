import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[0-9]/, 'Password must contain a number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain a special character'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

export const createPrdSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
});

export const updatePrdSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  status: z.enum(['draft', 'in-review', 'approved']).optional(),
  version: z.string().optional(),
  sections: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    content: z.string(),
    order: z.number(),
    required: z.boolean(),
    completed: z.boolean(),
    planningEnabled: z.boolean(),
  })).optional(),
});

export const planningMessageSchema = z.object({
  message: z.string().min(1, 'Message is required').max(5000, 'Message too long'),
});

export const analyzeTranscriptSchema = z.object({
  transcript: z
    .string()
    .min(100, 'Transcript must be at least 100 characters')
    .max(50000, 'Transcript must be less than 50,000 characters'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreatePrdInput = z.infer<typeof createPrdSchema>;
export type UpdatePrdInput = z.infer<typeof updatePrdSchema>;
export type PlanningMessageInput = z.infer<typeof planningMessageSchema>;

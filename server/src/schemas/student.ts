import { z } from 'zod'

export const FORM_LEVELS = [
  'FORM_1',
  'FORM_2',
  'FORM_3',
  'FORM_4',
  'FORM_5',
  'FORM_6',
] as const

export const createStudentSchema = z
  .object({
    fullName: z.string().trim().min(1).max(200),
    formLevel: z.enum(FORM_LEVELS),
    graduationYear: z.number().int().min(2020).max(2040),
    schoolStudentId: z.string().trim().min(1).max(50),
    studentEmail: z.email().optional().or(z.literal('')),
    studentPhone: z.string().max(30).optional(),
    parentEmail: z.email().optional().or(z.literal('')),
    parentPhone: z.string().max(30).optional(),
  })
  .strict()

export const updateStudentSchema = createStudentSchema.partial().omit({ schoolStudentId: true })

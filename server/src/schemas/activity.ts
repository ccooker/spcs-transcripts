import { z } from 'zod'

const monthSchema = z.number().int().min(1).max(12)
const yearSchema = z.number().int().min(2000).max(2040)

export const createActivitySchema = z
  .object({
    organisation: z.string().trim().min(1).max(200),
    role: z.string().trim().min(1).max(200),
    description: z.string().trim().max(500).optional(),
    startMonth: monthSchema,
    startYear: yearSchema,
    endMonth: monthSchema.optional().nullable(),
    endYear: yearSchema.optional().nullable(),
  })
  .strict()

export const updateActivitySchema = z
  .object({
    organisation: z.string().trim().min(1).max(200).optional(),
    role: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(500).optional(),
    startMonth: monthSchema.optional(),
    startYear: yearSchema.optional(),
    endMonth: monthSchema.optional().nullable(),
    endYear: yearSchema.optional().nullable(),
  })
  .strict()

import { z } from 'zod'

const monthSchema = z.number().int().min(1).max(12)
const yearSchema = z.number().int().min(2000).max(2040)

export const createAwardSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    issuer: z.string().trim().min(1).max(200),
    awardMonth: monthSchema,
    awardYear: yearSchema,
    level: z.enum(['SCHOOL', 'REGIONAL', 'STATE', 'NATIONAL', 'INTERNATIONAL']),
    description: z.string().trim().max(500).optional(),
  })
  .strict()

export const updateAwardSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    issuer: z.string().trim().min(1).max(200).optional(),
    awardMonth: monthSchema.optional(),
    awardYear: yearSchema.optional(),
    level: z.enum(['SCHOOL', 'REGIONAL', 'STATE', 'NATIONAL', 'INTERNATIONAL']).optional(),
    description: z.string().trim().max(500).optional(),
  })
  .strict()

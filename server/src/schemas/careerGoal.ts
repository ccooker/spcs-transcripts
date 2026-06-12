import { z } from 'zod'

export const CAREER_INTERESTS = [
  'MEDICINE_HEALTH',
  'LAW',
  'ENGINEERING',
  'BUSINESS_FINANCE',
  'EDUCATION',
  'ARTS_DESIGN',
  'SCIENCE_RESEARCH',
  'IT_TECHNOLOGY',
  'HOSPITALITY',
  'SOCIAL_SERVICES',
  'SPORTS',
  'UNDECIDED',
] as const

export const createCareerGoalSchema = z
  .object({
    interests: z
      .array(z.enum(CAREER_INTERESTS))
      .min(1, 'Select at least one interest area'),
    description: z.string().trim().max(500).optional(),
  })
  .strict()

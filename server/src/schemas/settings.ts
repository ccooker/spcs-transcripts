import { z } from 'zod'

export const settingsBodySchema = z
  .object({
    schoolName: z.string().min(1).max(100),
    schoolAddress: z.string().max(300).optional(),
    letterheadHtml: z.string().optional(),
  })
  .strict()

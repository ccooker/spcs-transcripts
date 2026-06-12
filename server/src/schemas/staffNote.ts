import { z } from 'zod'

export const createStaffNoteSchema = z
  .object({
    content: z.string().trim().min(1).max(500),
  })
  .strict()

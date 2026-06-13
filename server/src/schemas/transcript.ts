import { z } from 'zod'

export const upsertTranscriptSchema = z
  .object({
    status: z.enum(['DRAFT', 'FINALISED']),
    academicsContent: z.string().nullable(),
    activitiesContent: z.string().nullable(),
    awardsContent: z.string().nullable(),
    workExperienceContent: z.string().nullable(),
    careerGoalsContent: z.string().nullable(),
    staffEndorsementContent: z.string().nullable(),
    academicsVisible: z.boolean(),
    activitiesVisible: z.boolean(),
    awardsVisible: z.boolean(),
    workExperienceVisible: z.boolean(),
    careerGoalsVisible: z.boolean(),
    staffEndorsementVisible: z.boolean(),
    regenerate: z.boolean(),
  })
  .strict()
  .partial()

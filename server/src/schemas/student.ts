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

export const TRANSCRIPT_STATUSES = ['DRAFT', 'FINALISED', 'NONE'] as const

export const LIST_SORT_COLUMNS = [
  'fullName',
  'formLevel',
  'graduationYear',
  'transcriptStatus',
] as const

export const listStudentsQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
  formLevel: z.enum(FORM_LEVELS).optional(),
  transcriptStatus: z.enum(TRANSCRIPT_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  sort: z.enum(LIST_SORT_COLUMNS).default('formLevel'),
  order: z.enum(['asc', 'desc']).default('asc'),
  includeArchived: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true')
    .pipe(z.boolean())
    .default(false),
})

export type ListStudentsQuery = z.infer<typeof listStudentsQuerySchema>

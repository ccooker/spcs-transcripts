import { z } from 'zod'
import { FORM_LEVELS } from './student.js'

export const PRESET_SUBJECTS = [
  'Chinese Language',
  'English Language',
  'Mathematics (Compulsory)',
  'Citizenship and Social Development (CSD)',
  'Chinese History',
  'History',
  'Geography',
  'Economics',
  'Ethics and Religious Studies',
  'Business, Accounting and Financial Studies (BAFS)',
  'Tourism and Hospitality Studies (THS)',
  'Information and Communication Technology (ICT)',
  'Design and Applied Technology (DAT)',
  'Technology and Living (TL)',
  'Biology',
  'Chemistry',
  'Physics',
  'Combined Science',
  'Mathematics Extended Module 1 (M1)',
  'Mathematics Extended Module 2 (M2)',
  'Music',
  'Visual Arts',
  'Chinese Literature',
  'English Literature',
  'Physical Education (PE)',
  'OTHER',
] as const

export const createAcademicResultSchema = z
  .object({
    subject: z.enum(PRESET_SUBJECTS),
    subjectOther: z.string().trim().min(1).max(100).optional(),
    grade: z.string().trim().min(1).max(20),
    calendarYear: z.number().int().min(2010).max(2040),
    formLevel: z.enum(FORM_LEVELS),
    notes: z.string().trim().max(200).optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.subject !== 'OTHER' ||
      (data.subjectOther !== undefined && data.subjectOther.length > 0),
    { message: "Subject name is required when 'Other' is selected", path: ['subjectOther'] },
  )

export const updateAcademicResultSchema = z
  .object({
    subject: z.enum(PRESET_SUBJECTS).optional(),
    subjectOther: z.string().trim().min(1).max(100).optional(),
    grade: z.string().trim().min(1).max(20).optional(),
    calendarYear: z.number().int().min(2010).max(2040).optional(),
    formLevel: z.enum(FORM_LEVELS).optional(),
    notes: z.string().trim().max(200).optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.subject === undefined ||
      data.subject !== 'OTHER' ||
      (data.subjectOther !== undefined && data.subjectOther.length > 0),
    { message: "Subject name is required when 'Other' is selected", path: ['subjectOther'] },
  )

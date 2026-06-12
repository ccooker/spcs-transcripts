import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { studentIdParamSchema } from '../schemas/student.js'
import { createWorkExperienceSchema, updateWorkExperienceSchema } from '../schemas/workExperience.js'
import {
  WorkExperienceNotFoundError,
  createWorkExperience,
  deleteWorkExperience,
  listWorkExperiences,
  updateWorkExperience,
} from '../services/workExperience.js'

const router = Router({ mergeParams: true })

function parseStudentId(
  id: string | string[] | undefined,
  res: import('express').Response,
): string | null {
  const raw = Array.isArray(id) ? id[0] : id
  if (!raw) {
    res.status(404).json({ error: 'Student not found' })
    return null
  }
  const parsed = studentIdParamSchema.safeParse(raw)
  if (!parsed.success) {
    res.status(404).json({ error: 'Student not found' })
    return null
  }
  return parsed.data
}

router.get('/', async (req, res, next) => {
  const studentId = parseStudentId((req.params as Record<string, string>)['studentId'], res)
  if (!studentId) return
  try {
    const workExps = await listWorkExperiences(prisma, studentId)
    res.json(workExps)
  } catch (err) {
    next(err)
  }
})

router.post('/', async (req, res, next) => {
  const studentId = parseStudentId((req.params as Record<string, string>)['studentId'], res)
  if (!studentId) return
  const parsed = createWorkExperienceSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body' })
    return
  }
  try {
    const workExp = await createWorkExperience(prisma, studentId, parsed.data, req.user!.id)
    res.status(201).json(workExp)
  } catch (err) {
    next(err)
  }
})

router.patch('/:workExpId', async (req, res, next) => {
  const studentId = parseStudentId((req.params as Record<string, string>)['studentId'], res)
  if (!studentId) return
  const parsed = updateWorkExperienceSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body' })
    return
  }
  try {
    const workExp = await updateWorkExperience(
      prisma,
      req.params['workExpId'],
      studentId,
      parsed.data,
      req.user!.id,
    )
    res.json(workExp)
  } catch (err) {
    if (err instanceof WorkExperienceNotFoundError) {
      res.status(404).json({ error: 'Record not found' })
      return
    }
    next(err)
  }
})

router.delete('/:workExpId', async (req, res, next) => {
  const studentId = parseStudentId((req.params as Record<string, string>)['studentId'], res)
  if (!studentId) return
  try {
    await deleteWorkExperience(prisma, req.params['workExpId'], studentId, req.user!.id)
    res.status(204).send()
  } catch (err) {
    if (err instanceof WorkExperienceNotFoundError) {
      res.status(404).json({ error: 'Record not found' })
      return
    }
    next(err)
  }
})

export default router

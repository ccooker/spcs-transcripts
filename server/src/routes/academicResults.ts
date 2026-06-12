import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { studentIdParamSchema } from '../schemas/student.js'
import {
  createAcademicResultSchema,
  updateAcademicResultSchema,
} from '../schemas/academicResult.js'
import {
  AcademicResultNotFoundError,
  createAcademicResult,
  deleteAcademicResult,
  listAcademicResults,
  updateAcademicResult,
} from '../services/academicResult.js'

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
    const results = await listAcademicResults(prisma, studentId)
    res.json(results)
  } catch (err) {
    next(err)
  }
})

router.post('/', async (req, res, next) => {
  const studentId = parseStudentId((req.params as Record<string, string>)['studentId'], res)
  if (!studentId) return
  const parsed = createAcademicResultSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body' })
    return
  }
  try {
    const result = await createAcademicResult(prisma, studentId, parsed.data, req.user!.id)
    res.status(201).json(result)
  } catch (err) {
    next(err)
  }
})

router.patch('/:resultId', async (req, res, next) => {
  const studentId = parseStudentId((req.params as Record<string, string>)['studentId'], res)
  if (!studentId) return
  const parsed = updateAcademicResultSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body' })
    return
  }
  try {
    const result = await updateAcademicResult(
      prisma,
      req.params['resultId'],
      studentId,
      parsed.data,
      req.user!.id,
    )
    res.json(result)
  } catch (err) {
    if (err instanceof AcademicResultNotFoundError) {
      res.status(404).json({ error: 'Record not found' })
      return
    }
    next(err)
  }
})

router.delete('/:resultId', async (req, res, next) => {
  const studentId = parseStudentId((req.params as Record<string, string>)['studentId'], res)
  if (!studentId) return
  try {
    await deleteAcademicResult(prisma, req.params['resultId'], studentId, req.user!.id)
    res.status(204).send()
  } catch (err) {
    if (err instanceof AcademicResultNotFoundError) {
      res.status(404).json({ error: 'Record not found' })
      return
    }
    next(err)
  }
})

export default router

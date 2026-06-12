import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { studentIdParamSchema } from '../schemas/student.js'
import { createAwardSchema, updateAwardSchema } from '../schemas/award.js'
import {
  AwardNotFoundError,
  createAward,
  deleteAward,
  listAwards,
  updateAward,
} from '../services/award.js'

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
    const awards = await listAwards(prisma, studentId)
    res.json(awards)
  } catch (err) {
    next(err)
  }
})

router.post('/', async (req, res, next) => {
  const studentId = parseStudentId((req.params as Record<string, string>)['studentId'], res)
  if (!studentId) return
  const parsed = createAwardSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body' })
    return
  }
  try {
    const award = await createAward(prisma, studentId, parsed.data, req.user!.id)
    res.status(201).json(award)
  } catch (err) {
    next(err)
  }
})

router.patch('/:awardId', async (req, res, next) => {
  const studentId = parseStudentId((req.params as Record<string, string>)['studentId'], res)
  if (!studentId) return
  const parsed = updateAwardSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body' })
    return
  }
  try {
    const award = await updateAward(
      prisma,
      req.params['awardId'],
      studentId,
      parsed.data,
      req.user!.id,
    )
    res.json(award)
  } catch (err) {
    if (err instanceof AwardNotFoundError) {
      res.status(404).json({ error: 'Record not found' })
      return
    }
    next(err)
  }
})

router.delete('/:awardId', async (req, res, next) => {
  const studentId = parseStudentId((req.params as Record<string, string>)['studentId'], res)
  if (!studentId) return
  try {
    await deleteAward(prisma, req.params['awardId'], studentId, req.user!.id)
    res.status(204).send()
  } catch (err) {
    if (err instanceof AwardNotFoundError) {
      res.status(404).json({ error: 'Record not found' })
      return
    }
    next(err)
  }
})

export default router

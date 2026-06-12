import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { studentIdParamSchema } from '../schemas/student.js'
import { createCareerGoalSchema } from '../schemas/careerGoal.js'
import { createCareerGoal, listCareerGoals } from '../services/careerGoal.js'

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
    const goals = await listCareerGoals(prisma, studentId)
    res.json(goals)
  } catch (err) {
    next(err)
  }
})

router.post('/', async (req, res, next) => {
  const studentId = parseStudentId((req.params as Record<string, string>)['studentId'], res)
  if (!studentId) return
  const parsed = createCareerGoalSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body', errors: parsed.error.issues })
    return
  }
  try {
    const goal = await createCareerGoal(prisma, studentId, parsed.data, req.user!.id)
    res.status(201).json(goal)
  } catch (err) {
    next(err)
  }
})

// DO NOT register router.patch() or router.delete() — route omission is the D-16 enforcement mechanism

export default router

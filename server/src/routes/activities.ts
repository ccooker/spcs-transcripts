import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { studentIdParamSchema } from '../schemas/student.js'
import { createActivitySchema, updateActivitySchema } from '../schemas/activity.js'
import {
  ActivityNotFoundError,
  createActivity,
  deleteActivity,
  listActivities,
  updateActivity,
} from '../services/activity.js'

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
    const activities = await listActivities(prisma, studentId)
    res.json(activities)
  } catch (err) {
    next(err)
  }
})

router.post('/', async (req, res, next) => {
  const studentId = parseStudentId((req.params as Record<string, string>)['studentId'], res)
  if (!studentId) return
  const parsed = createActivitySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body' })
    return
  }
  try {
    const activity = await createActivity(prisma, studentId, parsed.data, req.user!.id)
    res.status(201).json(activity)
  } catch (err) {
    next(err)
  }
})

router.patch('/:activityId', async (req, res, next) => {
  const studentId = parseStudentId((req.params as Record<string, string>)['studentId'], res)
  if (!studentId) return
  const parsed = updateActivitySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body' })
    return
  }
  try {
    const activity = await updateActivity(
      prisma,
      req.params['activityId'],
      studentId,
      parsed.data,
      req.user!.id,
    )
    res.json(activity)
  } catch (err) {
    if (err instanceof ActivityNotFoundError) {
      res.status(404).json({ error: 'Record not found' })
      return
    }
    next(err)
  }
})

router.delete('/:activityId', async (req, res, next) => {
  const studentId = parseStudentId((req.params as Record<string, string>)['studentId'], res)
  if (!studentId) return
  try {
    await deleteActivity(prisma, req.params['activityId'], studentId, req.user!.id)
    res.status(204).send()
  } catch (err) {
    if (err instanceof ActivityNotFoundError) {
      res.status(404).json({ error: 'Record not found' })
      return
    }
    next(err)
  }
})

export default router

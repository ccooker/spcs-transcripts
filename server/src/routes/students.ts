import { Router } from 'express'
import { Prisma, Role } from '../generated/prisma/client.js'
import { prisma } from '../lib/prisma.js'
import { requireRole } from '../middleware/requireRole.js'
import {
  createStudentSchema,
  listStudentsQuerySchema,
  studentIdParamSchema,
  updateStudentSchema,
} from '../schemas/student.js'
import {
  archiveStudent,
  createStudent,
  getStudentById,
  listStudents,
  restoreStudent,
  StudentAlreadyActiveError,
  StudentArchivedError,
  StudentNotFoundError,
  updateStudent,
} from '../services/student.js'

const router = Router()

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

function handleStudentError(err: unknown, res: import('express').Response, next: import('express').NextFunction) {
  if (err instanceof StudentNotFoundError) {
    res.status(404).json({ error: 'Student not found' })
    return
  }
  if (err instanceof StudentArchivedError) {
    res.status(409).json({ error: 'Student is archived' })
    return
  }
  if (err instanceof StudentAlreadyActiveError) {
    res.status(409).json({ error: 'Student is not archived' })
    return
  }
  next(err)
}

router.get('/', async (req, res, next) => {
  try {
    const parsed = listStudentsQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid query parameters' })
      return
    }

    if (parsed.data.includeArchived && req.user!.role !== Role.ADMIN) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }

    const result = await listStudents(prisma, parsed.data)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const id = parseStudentId(req.params.id, res)
    if (!id) return

    const student = await getStudentById(prisma, id)
    res.json(student)
  } catch (err) {
    handleStudentError(err, res, next)
  }
})

router.patch('/:id', async (req, res, next) => {
  try {
    const id = parseStudentId(req.params.id, res)
    if (!id) return

    const parsed = updateStudentSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body' })
      return
    }
    if (Object.keys(parsed.data).length === 0) {
      res.status(400).json({ error: 'No fields to update' })
      return
    }

    const student = await updateStudent(prisma, id, parsed.data, req.user!.id)
    res.json(student)
  } catch (err) {
    handleStudentError(err, res, next)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseStudentId(req.params.id, res)
    if (!id) return

    const student = await archiveStudent(prisma, id, req.user!.id)
    res.json(student)
  } catch (err) {
    handleStudentError(err, res, next)
  }
})

router.post('/:id/restore', requireRole(Role.ADMIN), async (req, res, next) => {
  try {
    const id = parseStudentId(req.params.id, res)
    if (!id) return

    const student = await restoreStudent(prisma, id, req.user!.id)
    res.json(student)
  } catch (err) {
    handleStudentError(err, res, next)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const parsed = createStudentSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body' })
      return
    }

    const student = await createStudent(prisma, parsed.data, req.user!.id)
    res.status(201).json(student)
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      res.status(409).json({ error: 'A student with this ID already exists.' })
      return
    }
    next(err)
  }
})

import academicResultsRouter from './academicResults.js'
import activitiesRouter from './activities.js'
import awardsRouter from './awards.js'
import workExperienceRouter from './workExperience.js'
import careerGoalsRouter from './careerGoals.js'
import notesRouter from './notes.js'
import documentsRouter from './documents.js'
import transcriptRouter from './transcript.js'

router.use('/:studentId/academics', academicResultsRouter)
router.use('/:studentId/activities', activitiesRouter)
router.use('/:studentId/awards', awardsRouter)
router.use('/:studentId/work-experience', workExperienceRouter)
router.use('/:studentId/career-goals', careerGoalsRouter)
router.use('/:studentId/notes', notesRouter)
router.use('/:studentId/documents', documentsRouter)
router.use('/:studentId/transcript', transcriptRouter)

export default router

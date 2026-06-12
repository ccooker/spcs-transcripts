import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { studentIdParamSchema } from '../schemas/student.js'
import { createStaffNoteSchema } from '../schemas/staffNote.js'
import { createStaffNote, listStaffNotes } from '../services/staffNote.js'

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
    const notes = await listStaffNotes(prisma, studentId)
    res.json(notes)
  } catch (err) {
    next(err)
  }
})

router.post('/', async (req, res, next) => {
  const studentId = parseStudentId((req.params as Record<string, string>)['studentId'], res)
  if (!studentId) return
  const parsed = createStaffNoteSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body', errors: parsed.error.issues })
    return
  }
  try {
    const note = await createStaffNote(prisma, studentId, parsed.data.content, req.user!.id)
    res.status(201).json(note)
  } catch (err) {
    next(err)
  }
})

// DO NOT register router.patch() or router.delete() — route omission is the D-17 enforcement mechanism

export default router

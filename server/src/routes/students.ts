import { Router } from 'express'
import { Prisma } from '../generated/prisma/client.js'
import { prisma } from '../lib/prisma.js'
import { createStudentSchema } from '../schemas/student.js'
import { createStudent } from '../services/student.js'

const router = Router()

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

export default router

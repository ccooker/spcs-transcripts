import { PrismaClient } from '../generated/prisma/client.js'
import { logAudit } from './audit.js'
import type { z } from 'zod'
import type {
  createAcademicResultSchema,
  updateAcademicResultSchema,
} from '../schemas/academicResult.js'

type CreateInput = z.infer<typeof createAcademicResultSchema>
type UpdateInput = z.infer<typeof updateAcademicResultSchema>

export class AcademicResultNotFoundError extends Error {
  constructor() {
    super('Academic result not found')
    this.name = 'AcademicResultNotFoundError'
  }
}

export async function listAcademicResults(
  prisma: InstanceType<typeof PrismaClient>,
  studentId: string,
) {
  return prisma.academicResult.findMany({
    where: { studentId },
    orderBy: [{ calendarYear: 'desc' }, { formLevel: 'desc' }],
  })
}

export async function createAcademicResult(
  prisma: InstanceType<typeof PrismaClient>,
  studentId: string,
  data: CreateInput,
  userId: string,
) {
  const result = await prisma.academicResult.create({
    data: {
      studentId,
      subject: data.subject,
      subjectOther: data.subjectOther ?? null,
      grade: data.grade,
      calendarYear: data.calendarYear,
      formLevel: data.formLevel,
      notes: data.notes ?? null,
    },
  })

  await logAudit(prisma, {
    userId,
    action: 'CREATE',
    model: 'AcademicResult',
    recordId: result.id,
  })

  return result
}

export async function updateAcademicResult(
  prisma: InstanceType<typeof PrismaClient>,
  id: string,
  studentId: string,
  data: UpdateInput,
  userId: string,
) {
  const existing = await prisma.academicResult.findUnique({ where: { id } })
  if (!existing || existing.studentId !== studentId) {
    throw new AcademicResultNotFoundError()
  }

  const result = await prisma.academicResult.update({
    where: { id },
    data: {
      ...(data.subject !== undefined && { subject: data.subject }),
      ...(data.subjectOther !== undefined && { subjectOther: data.subjectOther ?? null }),
      ...(data.grade !== undefined && { grade: data.grade }),
      ...(data.calendarYear !== undefined && { calendarYear: data.calendarYear }),
      ...(data.formLevel !== undefined && { formLevel: data.formLevel }),
      ...(data.notes !== undefined && { notes: data.notes ?? null }),
    },
  })

  await logAudit(prisma, {
    userId,
    action: 'UPDATE',
    model: 'AcademicResult',
    recordId: result.id,
  })

  return result
}

export async function deleteAcademicResult(
  prisma: InstanceType<typeof PrismaClient>,
  id: string,
  studentId: string,
  userId: string,
) {
  const existing = await prisma.academicResult.findUnique({ where: { id } })
  if (!existing || existing.studentId !== studentId) {
    throw new AcademicResultNotFoundError()
  }

  await prisma.academicResult.delete({ where: { id } })

  await logAudit(prisma, {
    userId,
    action: 'DELETE',
    model: 'AcademicResult',
    recordId: id,
  })
}

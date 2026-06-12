import { PrismaClient } from '../generated/prisma/client.js'
import { logAudit } from './audit.js'
import type { z } from 'zod'
import type {
  createStudentSchema,
  ListStudentsQuery,
  updateStudentSchema,
} from '../schemas/student.js'

type CreateStudentInput = z.infer<typeof createStudentSchema>
type UpdateStudentInput = z.infer<typeof updateStudentSchema>

export class StudentNotFoundError extends Error {
  constructor() {
    super('Student not found')
    this.name = 'StudentNotFoundError'
  }
}

export class StudentArchivedError extends Error {
  constructor() {
    super('Student is archived')
    this.name = 'StudentArchivedError'
  }
}

export class StudentAlreadyActiveError extends Error {
  constructor() {
    super('Student is not archived')
    this.name = 'StudentAlreadyActiveError'
  }
}

export async function createStudent(
  prisma: InstanceType<typeof PrismaClient>,
  data: CreateStudentInput,
  userId: string,
) {
  const student = await prisma.student.create({
    data: {
      fullName: data.fullName,
      formLevel: data.formLevel,
      graduationYear: data.graduationYear,
      schoolStudentId: data.schoolStudentId,
      studentEmail: data.studentEmail || null,
      studentPhone: data.studentPhone ?? null,
      parentEmail: data.parentEmail || null,
      parentPhone: data.parentPhone ?? null,
    },
  })

  await logAudit(prisma, {
    userId,
    action: 'CREATE',
    model: 'Student',
    recordId: student.id,
  })

  return student
}

function escapeLikePattern(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&')
}

function buildListOrderBy(sort: ListStudentsQuery['sort'], order: ListStudentsQuery['order']) {
  if (sort === 'formLevel') {
    return [{ formLevel: order }, { fullName: 'asc' as const }]
  }
  return { [sort]: order }
}

export async function listStudents(
  prisma: InstanceType<typeof PrismaClient>,
  query: ListStudentsQuery,
) {
  const { q, formLevel, transcriptStatus, page, pageSize, sort, order, includeArchived } = query

  const where = {
    ...(includeArchived ? {} : { archivedAt: null }),
    ...(q
      ? { fullName: { contains: escapeLikePattern(q), mode: 'insensitive' as const } }
      : {}),
    ...(formLevel ? { formLevel } : {}),
    ...(transcriptStatus ? { transcriptStatus } : {}),
  }

  const skip = (page - 1) * pageSize

  const [data, total] = await prisma.$transaction([
    prisma.student.findMany({
      where,
      orderBy: buildListOrderBy(sort, order),
      skip,
      take: pageSize,
    }),
    prisma.student.count({ where }),
  ])

  return {
    data,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  }
}

export async function getStudentById(
  prisma: InstanceType<typeof PrismaClient>,
  id: string,
) {
  const student = await prisma.student.findUnique({ where: { id } })
  if (!student) {
    throw new StudentNotFoundError()
  }
  return student
}

export async function updateStudent(
  prisma: InstanceType<typeof PrismaClient>,
  id: string,
  data: UpdateStudentInput,
  userId: string,
) {
  const existing = await prisma.student.findUnique({ where: { id } })
  if (!existing) {
    throw new StudentNotFoundError()
  }
  if (existing.archivedAt) {
    throw new StudentArchivedError()
  }

  const student = await prisma.student.update({
    where: { id },
    data: {
      ...(data.fullName !== undefined && { fullName: data.fullName }),
      ...(data.formLevel !== undefined && { formLevel: data.formLevel }),
      ...(data.graduationYear !== undefined && { graduationYear: data.graduationYear }),
      ...(data.studentEmail !== undefined && {
        studentEmail: data.studentEmail || null,
      }),
      ...(data.studentPhone !== undefined && {
        studentPhone: data.studentPhone ?? null,
      }),
      ...(data.parentEmail !== undefined && {
        parentEmail: data.parentEmail || null,
      }),
      ...(data.parentPhone !== undefined && {
        parentPhone: data.parentPhone ?? null,
      }),
    },
  })

  await logAudit(prisma, {
    userId,
    action: 'UPDATE',
    model: 'Student',
    recordId: student.id,
  })

  return student
}

export async function archiveStudent(
  prisma: InstanceType<typeof PrismaClient>,
  id: string,
  userId: string,
) {
  const result = await prisma.student.updateMany({
    where: { id, archivedAt: null },
    data: { archivedAt: new Date() },
  })

  if (result.count === 0) {
    const existing = await prisma.student.findUnique({ where: { id } })
    if (!existing) {
      throw new StudentNotFoundError()
    }
    throw new StudentArchivedError()
  }

  const student = await prisma.student.findUniqueOrThrow({ where: { id } })

  await logAudit(prisma, {
    userId,
    action: 'DELETE',
    model: 'Student',
    recordId: student.id,
  })

  return student
}

export async function restoreStudent(
  prisma: InstanceType<typeof PrismaClient>,
  id: string,
  userId: string,
) {
  const existing = await prisma.student.findUnique({ where: { id } })
  if (!existing) {
    throw new StudentNotFoundError()
  }
  if (!existing.archivedAt) {
    throw new StudentAlreadyActiveError()
  }

  const student = await prisma.student.update({
    where: { id },
    data: { archivedAt: null },
  })

  await logAudit(prisma, {
    userId,
    action: 'UPDATE',
    model: 'Student',
    recordId: student.id,
    details: { restored: true },
  })

  return student
}

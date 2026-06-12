import { PrismaClient } from '../generated/prisma/client.js'
import { logAudit } from './audit.js'
import type { z } from 'zod'
import type { createWorkExperienceSchema, updateWorkExperienceSchema } from '../schemas/workExperience.js'

type CreateInput = z.infer<typeof createWorkExperienceSchema>
type UpdateInput = z.infer<typeof updateWorkExperienceSchema>

export class WorkExperienceNotFoundError extends Error {
  constructor() {
    super('Work experience not found')
    this.name = 'WorkExperienceNotFoundError'
  }
}

export async function listWorkExperiences(
  prisma: InstanceType<typeof PrismaClient>,
  studentId: string,
) {
  return prisma.workExperience.findMany({
    where: { studentId },
    orderBy: [
      { endYear: { sort: 'desc', nulls: 'first' } },
      { endMonth: { sort: 'desc', nulls: 'first' } },
      { startYear: 'desc' },
      { startMonth: 'desc' },
    ],
  })
}

export async function createWorkExperience(
  prisma: InstanceType<typeof PrismaClient>,
  studentId: string,
  data: CreateInput,
  userId: string,
) {
  const workExp = await prisma.workExperience.create({
    data: {
      studentId,
      employer: data.employer,
      role: data.role,
      description: data.description ?? null,
      startMonth: data.startMonth,
      startYear: data.startYear,
      endMonth: data.endMonth ?? null,
      endYear: data.endYear ?? null,
    },
  })

  await logAudit(prisma, {
    userId,
    action: 'CREATE',
    model: 'WorkExperience',
    recordId: workExp.id,
  })

  return workExp
}

export async function updateWorkExperience(
  prisma: InstanceType<typeof PrismaClient>,
  id: string,
  studentId: string,
  data: UpdateInput,
  userId: string,
) {
  const existing = await prisma.workExperience.findUnique({ where: { id } })
  if (!existing || existing.studentId !== studentId) {
    throw new WorkExperienceNotFoundError()
  }

  const workExp = await prisma.workExperience.update({
    where: { id },
    data: {
      ...(data.employer !== undefined && { employer: data.employer }),
      ...(data.role !== undefined && { role: data.role }),
      ...(data.description !== undefined && { description: data.description ?? null }),
      ...(data.startMonth !== undefined && { startMonth: data.startMonth }),
      ...(data.startYear !== undefined && { startYear: data.startYear }),
      ...(data.endMonth !== undefined && { endMonth: data.endMonth ?? null }),
      ...(data.endYear !== undefined && { endYear: data.endYear ?? null }),
    },
  })

  await logAudit(prisma, {
    userId,
    action: 'UPDATE',
    model: 'WorkExperience',
    recordId: workExp.id,
  })

  return workExp
}

export async function deleteWorkExperience(
  prisma: InstanceType<typeof PrismaClient>,
  id: string,
  studentId: string,
  userId: string,
) {
  const existing = await prisma.workExperience.findUnique({ where: { id } })
  if (!existing || existing.studentId !== studentId) {
    throw new WorkExperienceNotFoundError()
  }

  await prisma.workExperience.delete({ where: { id } })

  await logAudit(prisma, {
    userId,
    action: 'DELETE',
    model: 'WorkExperience',
    recordId: id,
  })
}

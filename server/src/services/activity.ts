import { PrismaClient } from '../generated/prisma/client.js'
import { logAudit } from './audit.js'
import type { z } from 'zod'
import type { createActivitySchema, updateActivitySchema } from '../schemas/activity.js'

type CreateInput = z.infer<typeof createActivitySchema>
type UpdateInput = z.infer<typeof updateActivitySchema>

export class ActivityNotFoundError extends Error {
  constructor() {
    super('Activity not found')
    this.name = 'ActivityNotFoundError'
  }
}

export async function listActivities(
  prisma: InstanceType<typeof PrismaClient>,
  studentId: string,
) {
  return prisma.activity.findMany({
    where: { studentId },
    orderBy: [
      { endYear: { sort: 'desc', nulls: 'first' } },
      { endMonth: { sort: 'desc', nulls: 'first' } },
      { startYear: 'desc' },
      { startMonth: 'desc' },
    ],
  })
}

export async function createActivity(
  prisma: InstanceType<typeof PrismaClient>,
  studentId: string,
  data: CreateInput,
  userId: string,
) {
  const activity = await prisma.activity.create({
    data: {
      studentId,
      organisation: data.organisation,
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
    model: 'Activity',
    recordId: activity.id,
  })

  return activity
}

export async function updateActivity(
  prisma: InstanceType<typeof PrismaClient>,
  id: string,
  studentId: string,
  data: UpdateInput,
  userId: string,
) {
  const existing = await prisma.activity.findUnique({ where: { id } })
  if (!existing || existing.studentId !== studentId) {
    throw new ActivityNotFoundError()
  }

  const activity = await prisma.activity.update({
    where: { id },
    data: {
      ...(data.organisation !== undefined && { organisation: data.organisation }),
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
    model: 'Activity',
    recordId: activity.id,
  })

  return activity
}

export async function deleteActivity(
  prisma: InstanceType<typeof PrismaClient>,
  id: string,
  studentId: string,
  userId: string,
) {
  const existing = await prisma.activity.findUnique({ where: { id } })
  if (!existing || existing.studentId !== studentId) {
    throw new ActivityNotFoundError()
  }

  await prisma.activity.delete({ where: { id } })

  await logAudit(prisma, {
    userId,
    action: 'DELETE',
    model: 'Activity',
    recordId: id,
  })
}

import { PrismaClient } from '../generated/prisma/client.js'
import { logAudit } from './audit.js'
import type { z } from 'zod'
import type { createAwardSchema, updateAwardSchema } from '../schemas/award.js'

type CreateInput = z.infer<typeof createAwardSchema>
type UpdateInput = z.infer<typeof updateAwardSchema>

export class AwardNotFoundError extends Error {
  constructor() {
    super('Award not found')
    this.name = 'AwardNotFoundError'
  }
}

export async function listAwards(
  prisma: InstanceType<typeof PrismaClient>,
  studentId: string,
) {
  return prisma.award.findMany({
    where: { studentId },
    orderBy: [
      { awardYear: 'desc' },
      { awardMonth: 'desc' },
    ],
  })
}

export async function createAward(
  prisma: InstanceType<typeof PrismaClient>,
  studentId: string,
  data: CreateInput,
  userId: string,
) {
  const award = await prisma.award.create({
    data: {
      studentId,
      title: data.title,
      issuer: data.issuer,
      awardMonth: data.awardMonth,
      awardYear: data.awardYear,
      level: data.level,
      description: data.description ?? null,
    },
  })

  await logAudit(prisma, {
    userId,
    action: 'CREATE',
    model: 'Award',
    recordId: award.id,
  })

  return award
}

export async function updateAward(
  prisma: InstanceType<typeof PrismaClient>,
  id: string,
  studentId: string,
  data: UpdateInput,
  userId: string,
) {
  const existing = await prisma.award.findUnique({ where: { id } })
  if (!existing || existing.studentId !== studentId) {
    throw new AwardNotFoundError()
  }

  const award = await prisma.award.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.issuer !== undefined && { issuer: data.issuer }),
      ...(data.awardMonth !== undefined && { awardMonth: data.awardMonth }),
      ...(data.awardYear !== undefined && { awardYear: data.awardYear }),
      ...(data.level !== undefined && { level: data.level }),
      ...(data.description !== undefined && { description: data.description ?? null }),
    },
  })

  await logAudit(prisma, {
    userId,
    action: 'UPDATE',
    model: 'Award',
    recordId: award.id,
  })

  return award
}

export async function deleteAward(
  prisma: InstanceType<typeof PrismaClient>,
  id: string,
  studentId: string,
  userId: string,
) {
  const existing = await prisma.award.findUnique({ where: { id } })
  if (!existing || existing.studentId !== studentId) {
    throw new AwardNotFoundError()
  }

  await prisma.award.delete({ where: { id } })

  await logAudit(prisma, {
    userId,
    action: 'DELETE',
    model: 'Award',
    recordId: id,
  })
}

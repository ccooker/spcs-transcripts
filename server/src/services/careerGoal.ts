import { PrismaClient, CareerInterest } from '../generated/prisma/client.js'
import { logAudit } from './audit.js'

export async function listCareerGoals(
  prisma: InstanceType<typeof PrismaClient>,
  studentId: string,
) {
  return prisma.careerGoal.findMany({
    where: { studentId },
    include: { author: { select: { displayName: true } } },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createCareerGoal(
  prisma: InstanceType<typeof PrismaClient>,
  studentId: string,
  data: { interests: CareerInterest[]; description?: string },
  userId: string,
) {
  const goal = await prisma.careerGoal.create({
    data: {
      studentId,
      authorId: userId,
      interests: data.interests,
      description: data.description ?? null,
    },
    include: { author: { select: { displayName: true } } },
  })

  await logAudit(prisma, {
    userId,
    action: 'CREATE',
    model: 'CareerGoal',
    recordId: goal.id,
  })

  return goal
}
// NO updateCareerGoal or deleteCareerGoal — immutable by design (D-16)

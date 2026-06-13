import { beforeEach } from 'vitest'
import { prisma } from '../../lib/prisma.js'

export async function clearDb(): Promise<void> {
  await prisma.staffNote.deleteMany()
  await prisma.careerGoal.deleteMany()
  await prisma.workExperience.deleteMany()
  await prisma.award.deleteMany()
  await prisma.activity.deleteMany()
  await prisma.academicResult.deleteMany()
  // @ts-expect-error — Document model not yet in client; remove after prisma generate in 04-02
  await prisma.document.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.student.deleteMany()
  await prisma.user.deleteMany()
}

beforeEach(clearDb)

export { prisma }

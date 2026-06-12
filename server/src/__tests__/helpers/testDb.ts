import { beforeEach } from 'vitest'
import { prisma } from '../../lib/prisma.js'

export async function clearDb(): Promise<void> {
  // @ts-expect-error model not yet in generated client — will exist after prisma generate in Task 2
  await prisma.staffNote.deleteMany()
  // @ts-expect-error model not yet in generated client — will exist after prisma generate in Task 2
  await prisma.careerGoal.deleteMany()
  await prisma.workExperience.deleteMany()
  await prisma.award.deleteMany()
  await prisma.activity.deleteMany()
  await prisma.academicResult.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.student.deleteMany()
  await prisma.user.deleteMany()
}

beforeEach(clearDb)

export { prisma }

import { beforeEach } from 'vitest'
import { prisma } from '../../lib/prisma.js'

export async function clearDb(): Promise<void> {
  // @ts-expect-error — transcript not in generated client until Plan 02 prisma generate
  await (prisma as any).transcript?.deleteMany()
  // @ts-expect-error — schoolSettings not in generated client until Plan 02 prisma generate
  await (prisma as any).schoolSettings?.deleteMany()
  await prisma.staffNote.deleteMany()
  await prisma.careerGoal.deleteMany()
  await prisma.workExperience.deleteMany()
  await prisma.award.deleteMany()
  await prisma.activity.deleteMany()
  await prisma.academicResult.deleteMany()
  await prisma.document.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.student.deleteMany()
  await prisma.user.deleteMany()
}

beforeEach(clearDb)

export { prisma }

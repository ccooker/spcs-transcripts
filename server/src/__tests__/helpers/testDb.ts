import { beforeEach } from 'vitest'
import { prisma } from '../../lib/prisma.js'

export async function clearDb(): Promise<void> {
  await prisma.activity.deleteMany()
  await prisma.academicResult.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.student.deleteMany()
  await prisma.user.deleteMany()
}

beforeEach(clearDb)

export { prisma }
